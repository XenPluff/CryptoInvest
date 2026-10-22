import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
} from "node:crypto";
import { createServer, type Server } from "node:http";
import express from "express";
import bcrypt from "bcryptjs";
import { isoCBOR } from "@simplewebauthn/server/helpers";

const state = vi.hoisted(() => ({
  user: null as any,
  challenges: new Map<string, any>(),
  keys: new Map<string, any>(),
  sessions: 0,
}));
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  passkeyChallenge: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  passkeyCredential: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  auditLog: { create: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
}));
vi.mock("../server/db", () => ({ prisma: db }));
// Rate-limit behavior belongs to the real API integration; isolated crypto cases
// must not share one loopback-IP attempt budget across tests.
vi.mock("express-rate-limit", () => ({
  rateLimit: () => (_req: any, _res: any, next: any) => next(),
}));
vi.mock("../server/config", () => ({
  config: {
    appOrigin: "http://localhost:3000",
    encryptionKey: Buffer.alloc(32),
  },
}));
vi.mock("../server/auth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (req.get("x-test-auth") !== "yes")
      return res.status(401).json({ error: "Sign in required." });
    req.auth = { user: state.user, sessionId: "unit-session" };
    next();
  },
  requireTotp: async (_user: any, code: string) => {
    if (code !== "123456")
      throw Object.assign(new Error("Invalid TOTP"), { status: 403 });
  },
  serializeUser: async (user: any) => ({ id: user.id, role: user.role }),
  issueAuthSession: async (
    _req: any,
    res: any,
    _user: any,
    _action: string,
    validate: (tx: any) => Promise<void>,
  ) => {
    await validate(db);
    state.sessions++;
    res.cookie("aureon_session", "unit-test-session", {
      httpOnly: true,
      sameSite: "lax",
    });
  },
}));

let server: Server, base: string;
const password = "Valid unit test password 123";
const hash = (data: string | Buffer) =>
  createHash("sha256").update(data).digest();
const encode = (data: Buffer | Uint8Array | string) =>
  Buffer.from(data).toString("base64url");

function authenticator() {
  const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = pair.publicKey.export({ format: "jwk" });
  const cose = isoCBOR.encode(
    new Map<any, any>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, Buffer.from(jwk.x!, "base64url")],
      [-3, Buffer.from(jwk.y!, "base64url")],
    ]),
  );
  const id = randomBytes(32);
  return {
    id: encode(id),
    registration(
      challenge: string,
      {
        origin = "http://localhost:3000",
        verified = true,
        synced = false,
      } = {},
    ) {
      const clientData = Buffer.from(
        JSON.stringify({
          type: "webauthn.create",
          challenge,
          origin,
          crossOrigin: false,
        }),
      );
      const idLength = Buffer.alloc(2);
      idLength.writeUInt16BE(id.length);
      const authData = Buffer.concat([
        hash("localhost"),
        Buffer.from([(verified ? 0x45 : 0x41) | (synced ? 0x18 : 0)]),
        Buffer.alloc(4),
        Buffer.alloc(16),
        idLength,
        id,
        cose,
      ]);
      const attestation = isoCBOR.encode(
        new Map<any, any>([
          ["fmt", "none"],
          ["attStmt", new Map()],
          ["authData", authData],
        ]),
      );
      return {
        id: encode(id),
        rawId: encode(id),
        type: "public-key",
        clientExtensionResults: {},
        response: {
          clientDataJSON: encode(clientData),
          attestationObject: encode(attestation),
          transports: ["internal"],
        },
      };
    },
    assertion(
      challenge: string,
      {
        counter = 1,
        origin = "http://localhost:3000",
        verified = true,
        wrongRp = false,
        synced = false,
      } = {},
    ) {
      const clientData = Buffer.from(
        JSON.stringify({
          type: "webauthn.get",
          challenge,
          origin,
          crossOrigin: false,
        }),
      );
      const count = Buffer.alloc(4);
      count.writeUInt32BE(counter);
      const authData = Buffer.concat([
        hash(wrongRp ? "attacker.invalid" : "localhost"),
        Buffer.from([(verified ? 0x05 : 0x01) | (synced ? 0x18 : 0)]),
        count,
      ]);
      const signature = sign(
        "sha256",
        Buffer.concat([authData, hash(clientData)]),
        pair.privateKey,
      );
      return {
        id: encode(id),
        rawId: encode(id),
        type: "public-key",
        clientExtensionResults: {},
        response: {
          clientDataJSON: encode(clientData),
          authenticatorData: encode(authData),
          signature: encode(signature),
          userHandle: encode(state.user.id),
        },
      };
    },
  };
}

async function request(
  path: string,
  body?: any,
  auth = false,
  method = "POST",
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "content-type": "application/json",
      ...(auth ? { "x-test-auth": "yes" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { response, data: await response.json() };
}
async function register(key = authenticator()) {
  const options = await request("/register/options", { password }, true);
  expect(options.response.status).toBe(200);
  const result = await request(
    "/register/verify",
    {
      challengeId: options.data.challengeId,
      label: "Test device",
      response: key.registration(options.data.options.challenge),
    },
    true,
  );
  expect(result.response.status).toBe(201);
  return key;
}
async function loginOptions(email = state.user.email) {
  return request("/login/options", { email });
}

beforeAll(async () => {
  const { passkeyRouter } = await import("../server/passkeys");
  const app = express();
  app.use(express.json());
  app.use(passkeyRouter);
  app.use((error: any, _req: any, res: any, _next: any) =>
    res.status(error.status ?? 500).json({ error: error.message }),
  );
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
beforeEach(() => {
  vi.clearAllMocks();
  state.challenges.clear();
  state.keys.clear();
  state.sessions = 0;
  state.user = {
    id: "unit-user-1",
    name: "Unit User",
    email: "unit@example.test",
    role: "USER",
    passwordHash: bcrypt.hashSync(password, 4),
    twoFactorEnabled: false,
    twoFactorSecret: null,
    suspended: false,
  };
  db.user.findUnique.mockImplementation(async ({ where }) =>
    where.id === state.user.id || where.email === state.user.email
      ? { ...state.user }
      : null,
  );
  db.$transaction.mockImplementation(async (callback) => callback(db));
  db.$queryRaw.mockResolvedValue([]);
  db.auditLog.create.mockResolvedValue({});
  db.passkeyChallenge.create.mockImplementation(async ({ data }) => {
    const record = { ...data, usedAt: null };
    state.challenges.set(data.id, record);
    return { ...record };
  });
  db.passkeyChallenge.findUnique.mockImplementation(async ({ where }) => {
    const found = state.challenges.get(where.id);
    return found ? { ...found } : null;
  });
  db.passkeyChallenge.deleteMany.mockResolvedValue({ count: 0 });
  db.passkeyChallenge.updateMany.mockImplementation(async ({ where, data }) => {
    const found = state.challenges.get(where.id);
    if (!found || found.usedAt || found.expiresAt <= where.expiresAt.gt)
      return { count: 0 };
    Object.assign(found, data);
    return { count: 1 };
  });
  db.passkeyCredential.create.mockImplementation(async ({ data }) => {
    state.keys.set(data.id, {
      ...data,
      createdAt: new Date(),
      lastUsedAt: null,
    });
    return data;
  });
  db.passkeyCredential.findUnique.mockImplementation(
    async ({ where }) => state.keys.get(where.id) ?? null,
  );
  db.passkeyCredential.findMany.mockImplementation(async ({ where }) =>
    [...state.keys.values()].filter((key) => key.userId === where.userId),
  );
  db.passkeyCredential.count.mockImplementation(async () => state.keys.size);
  db.passkeyCredential.update.mockImplementation(async ({ where, data }) =>
    Object.assign(state.keys.get(where.id), data),
  );
  db.passkeyCredential.deleteMany.mockImplementation(async ({ where }) => ({
    count:
      state.keys.get(where.id)?.userId === where.userId &&
      state.keys.delete(where.id)
        ? 1
        : 0,
  }));
});

describe("WebAuthn passkey security", () => {
  it("uses indistinguishable discoverable options for known and unknown email addresses", async () => {
    const known = await loginOptions(),
      unknown = await loginOptions("unknown@example.test");
    for (const result of [known, unknown]) {
      expect(result.response.status).toBe(200);
      expect(result.data.options).toMatchObject({
        rpId: "localhost",
        userVerification: "required",
      });
      expect(result.data.options.allowCredentials ?? []).toEqual([]);
      expect(result.data.options).not.toHaveProperty("user");
      expect(result.data).not.toHaveProperty("requiresTwoFactor");
    }
    expect(known.data.options.challenge).not.toBe(
      unknown.data.options.challenge,
    );
    expect(state.challenges.get(known.data.challengeId).challengeHash).not.toBe(
      known.data.options.challenge,
    );
  });

  it("requires an investor password for passkey changes and administrator TOTP", async () => {
    expect(
      (await request("/register/options", { password })).response.status,
    ).toBe(401);
    expect(
      (await request("/register/options", { password: "wrong" }, true)).response
        .status,
    ).toBe(403);
    const key = await register();
    expect(
      (await request(`/${key.id}`, { password: "wrong" }, true, "DELETE"))
        .response.status,
    ).toBe(403);
    state.user.twoFactorEnabled = true;
    state.user.twoFactorSecret = "encrypted-secret";
    const failed = await request("/register/options", { code: "123456" }, true);
    expect(failed.response.status).toBe(403);
    expect((await request("/register/options", { password }, true)).response.status).toBe(200);
    expect((await request(`/${key.id}`, { password }, true, "DELETE")).response.status).toBe(200);
    state.user.role = "ADMIN";
    expect((await request("/register/options", { password }, true)).response.status).toBe(403);
    expect(
      (await request("/register/options", { code: "123456" }, true)).response
        .status,
    ).toBe(200);
  });

  it("invalidates investor password enrollment proof after an administrator promotion", async () => {
    const key=authenticator();
    const options=await request("/register/options",{password},true);
    expect(options.response.status).toBe(200);
    state.user.role="ADMIN";
    const result=await request("/register/verify",{challengeId:options.data.challengeId,label:"Promoted account",response:key.registration(options.data.options.challenge)},true);
    expect(result.response.status).toBe(400);
    expect(state.keys.size).toBe(0);
  });
  it("verifies a real ES256 registration and assertion, persists the counter, and issues one session", async () => {
    const key = await register(),
      options = await loginOptions();
    const result = await request("/login/verify", {
      challengeId: options.data.challengeId,
      response: key.assertion(options.data.options.challenge),
    });
    expect(result.response.status).toBe(200);
    expect(state.sessions).toBe(1);
    expect(state.keys.get(key.id).counter).toBe(1n);
    expect(result.response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("rejects replayed and expired challenges before issuing a session", async () => {
    const key = await register(),
      options = await loginOptions();
    const payload = {
      challengeId: options.data.challengeId,
      response: key.assertion(options.data.options.challenge),
    };
    const results = await Promise.all([
      request("/login/verify", payload),
      request("/login/verify", payload),
    ]);
    expect(results.map((result) => result.response.status).sort()).toEqual([
      200, 400,
    ]);
    expect(state.sessions).toBe(1);
    const expired = await loginOptions();
    state.challenges.get(expired.data.challengeId).expiresAt = new Date(
      Date.now() - 1,
    );
    expect(
      (
        await request("/login/verify", {
          challengeId: expired.data.challengeId,
          response: key.assertion(expired.data.options.challenge, {
            counter: 2,
          }),
        })
      ).response.status,
    ).toBe(400);
    expect(state.sessions).toBe(1);
  });

  it("rejects malformed assertions without invoking signature verification or session issuance", async () => {
    const result = await request("/login/verify", {
      challengeId: "not-a-uuid",
      response: {},
    });
    expect(result.response.status).toBe(400);
    expect(state.sessions).toBe(0);
    expect(db.passkeyCredential.update).not.toHaveBeenCalled();
  });

  it("requires the expected origin, relying-party hash, user verification, signature, and increasing single-device counter", async () => {
    const key = await register();
    for (const override of [
      { origin: "https://attacker.invalid" },
      { wrongRp: true },
      { verified: false },
    ]) {
      const options = await loginOptions();
      expect(
        (
          await request("/login/verify", {
            challengeId: options.data.challengeId,
            response: key.assertion(options.data.options.challenge, override),
          })
        ).response.status,
      ).toBe(401);
    }
    const tamper = await loginOptions(),
      response = key.assertion(tamper.data.options.challenge);
    response.response.signature = encode(randomBytes(70));
    expect(
      (
        await request("/login/verify", {
          challengeId: tamper.data.challengeId,
          response,
        })
      ).response.status,
    ).toBe(401);
    state.keys.get(key.id).counter = 5n;
    const stale = await loginOptions();
    expect(
      (
        await request("/login/verify", {
          challengeId: stale.data.challengeId,
          response: key.assertion(stale.data.options.challenge, { counter: 5 }),
        })
      ).response.status,
    ).toBe(401);
    expect(state.sessions).toBe(0);
  });

  it("preserves the existing TOTP requirement and invalidates challenges after security changes", async () => {
    const key = await register();
    state.user.twoFactorEnabled = true;
    state.user.twoFactorSecret = "encrypted-secret";
    const missing = await loginOptions();
    expect(
      (
        await request("/login/verify", {
          challengeId: missing.data.challengeId,
          response: key.assertion(missing.data.options.challenge),
        })
      ).response.status,
    ).toBe(401);
    expect(state.sessions).toBe(0);
    const valid = await loginOptions();
    expect(
      (
        await request("/login/verify", {
          challengeId: valid.data.challengeId,
          response: key.assertion(valid.data.options.challenge),
          code: "123456",
        })
      ).response.status,
    ).toBe(200);
    const changed = await loginOptions();
    state.user.passwordHash = bcrypt.hashSync("Changed password", 4);
    expect(
      (
        await request("/login/verify", {
          challengeId: changed.data.challengeId,
          response: key.assertion(changed.data.options.challenge, {
            counter: 2,
          }),
          code: "123456",
        })
      ).response.status,
    ).toBe(401);
    expect(state.sessions).toBe(1);
  });

  it("supports synced credentials with zero counters while still consuming every challenge", async () => {
    const key = authenticator();
    const registration = await request("/register/options", { password }, true);
    expect(
      (
        await request(
          "/register/verify",
          {
            challengeId: registration.data.challengeId,
            label: "Synced passkey",
            response: key.registration(registration.data.options.challenge, {
              synced: true,
            }),
          },
          true,
        )
      ).response.status,
    ).toBe(201);
    for (let attempt = 0; attempt < 2; attempt++) {
      const options = await loginOptions();
      expect(
        (
          await request("/login/verify", {
            challengeId: options.data.challengeId,
            response: key.assertion(options.data.options.challenge, {
              counter: 0,
              synced: true,
            }),
          })
        ).response.status,
      ).toBe(200);
    }
    expect(state.keys.get(key.id)).toMatchObject({
      counter: 0n,
      backedUp: true,
      deviceType: "multiDevice",
    });
    expect(state.sessions).toBe(2);
  });
});
