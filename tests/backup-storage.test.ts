import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
const mocks = vi.hoisted(() => ({ send: vi.fn(), destroy: vi.fn() }));
vi.mock("@aws-sdk/client-s3", () => ({ S3Client: class { send = mocks.send; destroy = mocks.destroy; }, PutObjectCommand: class { constructor(public input: any) {} }, GetObjectCommand: class { constructor(public input: any) {} } }));
import { uploadBackup } from "../server/backups";
describe("off-site backup verification", () => {
  let directory: string; let path: string;
  const bytes = Buffer.from("Encrypted archive fixture"); const hash = createHash("sha256").update(bytes).digest("hex");
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "aureon-storage-test-")); path = join(directory, "encrypted.aureon"); await writeFile(path, bytes);
    for (const name of ["BACKUP_S3_BUCKET", "BACKUP_S3_REGION", "BACKUP_S3_ACCESS_KEY_ID", "BACKUP_S3_SECRET_ACCESS_KEY"]) vi.stubEnv(name, "fixture");
  });
  afterAll(async () => { vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });
  beforeEach(() => { mocks.send.mockReset(); mocks.destroy.mockReset(); });
  it("reads uploaded bytes back and verifies their checksum before returning success", async () => {
    mocks.send.mockResolvedValueOnce({}).mockResolvedValueOnce({ Body: (async function* () { yield bytes; })() });
    await uploadBackup(path, "aureon/backups/fixture.aureon", hash, bytes.length);
    expect(mocks.send).toHaveBeenCalledTimes(2); expect(mocks.send.mock.calls[0][0].input.Metadata.sha256).toBe(hash);
    expect(mocks.send.mock.calls[1][0].input.Key).toBe("aureon/backups/fixture.aureon"); expect(mocks.destroy).toHaveBeenCalledOnce();
  });
  it.each(["corrupt", "missing", "oversized"])("rejects a %s stored archive", async variant => {
    const body = variant === "missing" ? undefined : (async function* () { yield variant === "oversized" ? Buffer.concat([bytes, bytes]) : Buffer.from("Corrupted bytes"); })();
    mocks.send.mockResolvedValueOnce({}).mockResolvedValueOnce({ Body: body });
    await expect(uploadBackup(path, "aureon/backups/fixture.aureon", hash, bytes.length)).rejects.toThrow();
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });
});
