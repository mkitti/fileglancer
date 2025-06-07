const sleepInSecs = (secs: number) =>
  new Promise(resolve => setTimeout(resolve, secs * 1000));

const openFileGlancer = async (page: IJupyterLabPageFixture) => {
  // open jupyter lab
  await page.goto();
  await page.waitForSelector('.jp-FileBrowser');
  // click on Fileglancer icon
  await page.getByText('Fileglancer', { exact: true }).click();
  // Wait for response or changes on the page
  await page.waitForResponse((response) => response.status() === 200);
};

export { sleepInSecs, openFileGlancer };
