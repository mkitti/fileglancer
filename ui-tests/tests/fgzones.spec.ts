import { expect, test } from '@jupyterlab/galata';

test.describe('Fileglancer zones', () => {

  test.beforeEach(async ({ page }) => {
    // click on Fileglancer icon
    await page.getByText('Fileglancer', { exact: true }).click();
  });

  test('Home becomes visible when Zone/Local is expanded', async ({ page }) => {
    const homeLocator = page.getByRole('link', { name: 'home' });
    await expect(homeLocator).toHaveCount(0);
    
    const zonesLocator = page.getByText('Zones');
    const localZoneLocator = page.getByText('Local');
    console.log("!!!! ZONES VISIBLE ", zonesLocator.isVisible(), localZoneLocator.isVisible());
    if (!localZoneLocator.isVisible()) {
      await zonesLocator.click();
    } else {
      // click on zones and hide local zone
      await zonesLocator.click();
      await expect(localZoneLocator).toHaveCount(0);
      // click again and make local zone visible
      await zonesLocator.click();
      await expect(localZoneLocator).toBeVisible();
    }
    await localZoneLocator.click();

    await expect(homeLocator).toBeVisible();
  });

})
