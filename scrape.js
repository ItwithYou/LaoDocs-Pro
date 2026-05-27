const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  // We don't have internet access but we can try to search via google or github api
  await browser.close();
})();
