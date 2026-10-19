import { test, expect, type Page } from "@playwright/test";

// UI request fixtures only. Financial authorization, ledger posting and races
// are exercised separately against a disposable real PostgreSQL database.
async function financialFixture(page: Page) {
  const users = [
    {
      id: "sender",
      name: "Fixture Sender",
      email: "sender@example.test",
      role: "USER",
      balance: 100,
    },
    {
      id: "recipient",
      name: "Fixture Recipient",
      email: "recipient@example.test",
      role: "USER",
      balance: 0,
    },
  ];
  const requests: { path: string; body: any }[] = [];
  const transfers: any[] = [];
  const transactions = [
    {
      id: "deposit",
      type: "DEPOSIT",
      status: "PENDING",
      amount: 20,
      user: users[0],
      createdAt: new Date().toISOString(),
    },
    {
      id: "payout",
      type: "WITHDRAWAL",
      status: "APPROVED",
      amount: 10,
      user: users[0],
      createdAt: new Date().toISOString(),
    },
    {
      id: "transfer",
      type: "TRANSFER",
      status: "PENDING",
      amount: 5,
      user: users[0],
      direction: "DEBIT",
      createdAt: new Date().toISOString(),
    },
  ];
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.replace(/^\/api/, "");
    if (path === "/auth/me")
      return route.fulfill({
        json: {
          user: {
            id: "operator",
            name: "Fixture Operator",
            role: "ADMIN",
            twoFactorEnabled: true,
          },
        },
      });
    if (path === "/notifications")
      return route.fulfill({ json: { notifications: [] } });
    if (path === "/admin/users") return route.fulfill({ json: { users } });
    if (path.startsWith("/admin/users/") && path.endsWith("/ledger"))
      return route.fulfill({
        json: {
          balance: users.find((user) => path.includes(user.id))?.balance,
          entries: [],
        },
      });
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      requests.push({ path, body });
      if (path === "/admin/balance-adjustments") {
        users[0].balance +=
          (body.direction === "credit" ? 1 : -1) * Number(body.amount);
        return route.fulfill({
          status: 201,
          json: {
            message: "Balance adjustment recorded in the ledger.",
            balance: users[0].balance,
          },
        });
      }
      if (path === "/admin/transfers") {
        const transfer = {
          id: `fixture-${transfers.length}`,
          fromUser: users[0],
          toUser: users[1],
          amount: Number(body.amount),
          status: "PENDING",
          note: body.note,
        };
        transfers.push(transfer);
        return route.fulfill({
          status: 201,
          json: {
            transfer,
            message: "Transfer queued for review; funds reserved.",
          },
        });
      }
      if (path.endsWith("/review")) {
        const transfer = transfers.find((transfer) =>
          path.includes(transfer.id),
        );
        transfer.status = body.action === "approve" ? "SETTLED" : "REJECTED";
        return route.fulfill({
          json: { transfer, message: "Transfer decision recorded." },
        });
      }
    }
    if (path === "/admin/transfers")
      return route.fulfill({ json: { transfers } });
    if (path === "/admin/transactions")
      return route.fulfill({
        json: {
          transactions: transactions.filter(
            (transaction) =>
              (!url.searchParams.get("type") ||
                transaction.type === url.searchParams.get("type")) &&
              (!url.searchParams.get("status") ||
                transaction.status === url.searchParams.get("status")),
          ),
        },
      });
    return route.fulfill({
      status: 404,
      json: { error: "No UI fixture for this route." },
    });
  });
  return requests;
}
async function proof(panel: ReturnType<Page["locator"]>) {
  await panel
    .getByLabel("Reason and review note", { exact: true })
    .fill("Reviewed account authority and supporting records.");
  await panel
    .getByLabel("Current authenticator code", { exact: true })
    .fill("123456");
  await panel.getByRole("checkbox").check();
}
test("UI fixture: administrators can record credits and debits with references and explicit new requests", async ({
  page,
}) => {
  const requests = await financialFixture(page);
  await page.goto("/admin/balances");
  const panel = page
    .locator(".ws-panel")
    .filter({
      has: page.getByRole("heading", { name: "Adjust an investor balance" }),
    });
  await panel
    .getByRole("combobox", { name: "Investor account", exact: true })
    .selectOption("sender");
  await panel
    .getByLabel("Adjustment amount (USD)", { exact: true })
    .fill("25.50");
  await panel
    .getByLabel("Supporting reconciliation reference", { exact: true })
    .fill("reconciled-proof-001");
  await proof(panel);
  await panel
    .getByRole("button", { name: "Record balance adjustment", exact: true })
    .click();
  await expect(
    panel.getByText("Balance adjustment recorded in the ledger."),
  ).toBeVisible();
  expect(requests[0].body).toMatchObject({
    userId: "sender",
    direction: "credit",
    amount: "25.50",
    externalReference: "reconciled-proof-001",
    code: "123456",
  });
  await expect(
    panel.getByRole("button", {
      name: "Record balance adjustment",
      exact: true,
    }),
  ).toBeDisabled();
  await panel
    .getByRole("button", { name: "New adjustment", exact: true })
    .click();
  await panel
    .getByRole("combobox", { name: "Adjustment direction", exact: true })
    .selectOption("debit");
  await panel.getByLabel("Adjustment amount (USD)", { exact: true }).fill("5");
  await panel
    .getByLabel("Supporting reconciliation reference", { exact: true })
    .fill("reconciled-proof-002");
  await proof(panel);
  await panel
    .getByRole("button", { name: "Record balance adjustment", exact: true })
    .click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].body.direction).toBe("debit");
  expect(requests[1].body.idempotencyKey).not.toBe(
    requests[0].body.idempotencyKey,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("UI fixture: administrator transfers can be queued, declined, and approved", async ({
  page,
}) => {
  const requests = await financialFixture(page);
  await page.goto("/admin/transfers");
  const create = page
    .locator(".ws-panel")
    .filter({
      has: page.getByRole("heading", { name: "Create an account transfer" }),
    });
  for (const action of ["reject", "approve"]) {
    await create
      .getByRole("combobox", { name: "Sender account", exact: true })
      .selectOption("sender");
    await create
      .getByRole("combobox", { name: "Recipient account", exact: true })
      .selectOption("recipient");
    await create
      .getByLabel("Transfer amount (USD)", { exact: true })
      .fill("20");
    await proof(create);
    await create
      .getByRole("button", { name: "Queue transfer for review", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Review transfer", exact: true })
      .click();
    const review = page
      .locator(".ws-panel")
      .filter({
        has: page.getByRole("heading", { name: "Review selected transfer" }),
      });
    await review
      .getByRole("combobox", { name: "Transfer decision", exact: true })
      .selectOption(action);
    await proof(review);
    await review
      .getByRole("button", { name: "Save transfer decision", exact: true })
      .click();
    await expect(review).toHaveCount(0);
    if (action === "reject")
      await create
        .getByRole("button", { name: "New transfer", exact: true })
        .click();
  }
  expect(
    requests
      .filter((request) => request.path.endsWith("/review"))
      .map((request) => request.body.action),
  ).toEqual(["reject", "approve"]);
  expect(
    requests.filter((request) => request.path === "/admin/transfers")[0].body,
  ).toMatchObject({
    fromUserId: "sender",
    toUserId: "recipient",
    amount: "20",
  });
});
test("UI fixture: transaction filters lead to deposit, withdrawal, and transfer review controls", async ({
  page,
}) => {
  await financialFixture(page);
  await page.goto("/admin/transactions");
  await expect(
    page.locator('a[href="/admin/deposits"]', { hasText: "Review" }),
  ).toBeVisible();
  await expect(
    page.locator('a[href="/admin/withdrawals"]', { hasText: "Review" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Transaction type", exact: true })
    .selectOption("TRANSFER");
  await page
    .getByRole("combobox", { name: "Transaction status", exact: true })
    .selectOption("PENDING");
  await expect(page.getByRole("row")).toHaveCount(2);
  await expect(
    page.locator('a[href="/admin/transfers"]', { hasText: "Review" }),
  ).toBeVisible();
});
