const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');

(async () => {

  const browser = await puppeteer.launch({
    headless: false
  });

  // 打开页面
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(100000);
  await page.goto('https://ttrss.com/');

  // 获取这个页面上文章链接地址
  let pageUrls = await page.evaluate(() => {
    let selector = 'article.excerpt h2 a';
    let pageUrlsDom = [...document.querySelectorAll(selector)];
    return pageUrlsDom.map(e => e.href)
  });

  const openPageAndDownload = async (url) => {
    // 跳转到文章页
    await page.goto(url)
    // 获取文章标题
    const title = await page.evaluate(() => {
      let titleSelector = 'h1.article-title a';
      let titleDom = [...document.querySelectorAll(titleSelector)];
      return titleDom[0].innerHTML
    })
    // 在文章页上获取图片地址列表
    let imgUrls = await page.evaluate(() => {
      let selector = 'article.article-content img';
      let dom = [...document.querySelectorAll(selector)];
      return dom.map(e => e.src)
    })
    // 下载图片
    imgUrls.forEach((e, i) => {
      axios.get(e, {
        responseType: 'stream'
      })
        .then(res => {
          res.data.pipe(fs.createWriteStream(`./ttrss/${i}.${e.substr(e.length-3)}`));
        })
        .catch(err => {
          console.log('------------------------------')
        })
    });
  }

  openPageAndDownload(pageUrls[0])

  //   await page.screenshot({
  //     path: 'screenshots/screenshots.png',
  //     fullPage: true
  //   });
  //   await browser.close();

})()