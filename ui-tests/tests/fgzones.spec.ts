import { expect, test } from '@jupyterlab/galata';

test.describe('Fileglancer zones', () => {
  const sleepInSecs = (secs: number) =>
    new Promise(resolve => setTimeout(resolve, secs * 1000));

  test.beforeEach(async ({ page }) => {
    // click on Fileglancer icon
    await page.getByText('Fileglancer', { exact: true }).click();
  });

  test.describe('local zone', () => {
    test('Home becomes visible when Local is expanded', async ({ page }) => {
      const zonesLocator = page.getByText('Zones');
      const localZoneLocator = page.getByText('Local');
      const homeLocator = page.getByRole('link', { name: 'home' });

      await expect(zonesLocator).toBeVisible();
      // the home locator initially is not visible
      await expect(homeLocator).toHaveCount(0);

      // assume local is visible so click on zones and hide all zones (including local)
      await zonesLocator.click();
      await expect(localZoneLocator).toHaveCount(0);
      // click again on zones to make them visible
      await zonesLocator.click();
      // expect the local zone to be visible
      await expect(localZoneLocator).toBeVisible();
      // click on it to view home
      await localZoneLocator.click();

      await expect(homeLocator).toBeVisible();

      await sleepInSecs(15);
    });
  });

  test.describe('favorites', () => {
    const TEST_USER = 'testUser';
    const TEST_SHARED_PATHS = [
      {
        name: 'groups_z1_homezone',
        zone: 'Z1',
        storage: 'home',
        mount_path: '/z1/home'
      },
      {
        name: 'groups_z1_primaryzone',
        zone: 'Z1',
        storage: 'primary',
        mount_path: '/z1/labarea'
      },
      {
        name: 'groups_z2_scratchzone',
        zone: 'Z2',
        storage: 'scratch',
        mount_path: '/z2/scratch'
      }
    ];

    test.beforeEach(async ({ page }) => {
      // mock API calls
      await page.route('/api/fileglancer/profile', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            username: TEST_USER
          })
        });
      });

      await page.route('/api/fileglancer/file-share-paths', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            paths: TEST_SHARED_PATHS
          })
        });
      });
    });

    test('entire zone', async ({ page }) => {
      // click on Z1
      await page.getByText('Z1', { exact: true }).click();

      await expect(
        page.getByRole('link', { name: `${TEST_SHARED_PATHS[0].storage}` })
      ).toBeVisible();

      await expect(
        page.getByRole('link', { name: `${TEST_SHARED_PATHS[1].storage}` })
      ).toBeVisible();

      // click on Z2
      await page.getByText('Z2', { exact: true }).click();

      await expect(
        page.getByRole('link', { name: `${TEST_SHARED_PATHS[2].storage}` })
      ).toBeVisible();

      await sleepInSecs(5 * 60);
      console.log('!!!!!!');
    });
  });
});
