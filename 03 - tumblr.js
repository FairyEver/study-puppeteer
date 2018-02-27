// https://github.com/GoogleChrome/puppeteer

const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false
  });
  const page = await browser.newPage();
  page.setViewport({
    width: 1366,
    height: 768
  })
  await page.goto('http://www.tumblr.com/dashboard');
//   await page.screenshot({
//     path: 'screenshots/screenshots.png',
//     fullPage: true
//   });
//   await browser.close();
})()