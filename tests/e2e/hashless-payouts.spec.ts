import { test, expect } from '@playwright/test';

test('administrator can record a reconciled payout without a blockchain hash', async ({ page }) => {
  const requests: any[] = [];
  const withdrawal = { id: 'hashless-payout-ui', userId: 'investor', asset: 'ETH', network: 'Ethereum', amount: 10, status: 'APPROVED', address: '0x' + '2'.repeat(40), createdAt: new Date().toISOString(), user: { id: 'investor', name: 'Investor Fixture' } };
  await page.route('**/api/**', route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (req.method() !== 'GET') { requests.push({ path, body: req.postDataJSON() }); return route.fulfill({ json: { withdrawal: { ...withdrawal, status: 'PAID', txHash: null } } }); }
    return route.fulfill({ json: path === '/api/auth/me' ? { user: { id: 'operator', name: 'Operator Fixture', role: 'ADMIN', twoFactorEnabled: true, emailVerified: true } } : path === '/api/notifications' ? { notifications: [] } : path === '/api/admin/withdrawals' ? { withdrawals: requests.length ? [] : [withdrawal] } : {} });
  });
  await page.goto('/admin/withdrawals');
  await page.getByLabel('Filter review status').selectOption('approved');
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('[name="txHash"]')).toHaveCount(0);
  await dialog.getByLabel('Decision').selectOption('paid');
  await dialog.locator('textarea[name="note"]').fill('External payout independently reconciled against the transfer records.');
  await dialog.getByLabel('Operator authenticator code').fill('123456');
  for (const width of [1440, 390, 320]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); }
  await dialog.getByRole('button', { name: 'Record review decision' }).click();
  await expect(dialog).toHaveCount(0);
  expect(requests).toEqual([{ path: '/api/admin/withdrawals/hashless-payout-ui/review', body: { action: 'paid', note: 'External payout independently reconciled against the transfer records.', code: '123456' } }]);
});
