import { expect, test } from '../fixtures/fileglancer-fixture';

test.describe('API tokens', () => {
  test('create, display once, and revoke a token', async ({
    fileglancerPage: page
  }) => {
    const tokenName = `e2e token ${Date.now()}`;

    await page.goto('/api-tokens', { waitUntil: 'domcontentloaded' });

    await expect(
      page.getByRole('heading', { name: 'API Tokens' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'New Token' }).click();
    await page.getByPlaceholder('laptop notebook').fill(tokenName);
    await page.getByRole('button', { name: 'Create' }).click();

    // The secret is shown exactly once, in the confirmation dialog.
    await expect(page.getByText('Copy this now')).toBeVisible();
    await expect(page.getByText(/FILEGLANCER_TOKEN=fgt_/)).toBeVisible();

    // Capture the exact secret so we can prove it never appears again.
    const snippetText = await page.locator('pre').innerText();
    const secretMatch = snippetText.match(/FILEGLANCER_TOKEN=(fgt_\S+)/);
    expect(secretMatch).not.toBeNull();
    const secret = secretMatch![1];

    await page.getByRole('button', { name: 'Done' }).click();

    // The listing shows the token but never its secret. Assert on the exact
    // captured secret string (not a pattern) so this doesn't accidentally
    // match the token's public id, which does appear in the DOM.
    await expect(page.getByText(tokenName)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(secret);

    // Revoking requires an explicit confirmation step: clicking the card's
    // "Revoke" button only opens the dialog, it does not revoke yet.
    const tokenCard = page
      .locator('[data-testid="api-token-list"] > *')
      .filter({ hasText: tokenName });
    await tokenCard
      .getByRole('button', { name: 'Revoke', exact: true })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Revoke API Token' })
    ).toBeVisible();
    await expect(
      page.locator('strong').filter({ hasText: tokenName })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Revoke Token' }).click();

    // Wait for the confirmation dialog to fully close before checking the
    // list, so its <strong>{tokenName}</strong> can't double-match below.
    await expect(
      page.getByRole('heading', { name: 'Revoke API Token' })
    ).not.toBeVisible();

    // The token is gone from the list once the revocation is confirmed.
    await expect(
      page.getByTestId('api-token-list').getByText(tokenName)
    ).not.toBeVisible();
  });
});
