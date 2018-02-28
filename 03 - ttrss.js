const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');



(async () => {


  
  // 列表页一共多少页
  let listPageTotal = 0



  const browser = await puppeteer.launch({
    headless: false
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(100000);



  // 打开一个页面 并返回这个页面上存在的文章链接
  // 适用于类似首页那种页面
  const getArticleUrl = async (url) => {
    // 打开指定的页面
    await page.goto(url);
    // 获取这个页面上文章链接地址
    let pageUrls = await page.evaluate(() => {
      return [...document.querySelectorAll('article.excerpt h2 a')].map(e => e.href)
    });
    // 返回这个页面上的列表链接
    return pageUrls;
  }



  // 打开一个文章页面 并且下载这个页面上的图片
  // 只适用于没有分页的文章页
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
          console.log(`${e} 下载失败`)
        })
    });
  }



  // 获取这个页面上文章链接地址
  const pageUrls = await getArticleUrl('https://ttrss.com/')
  openPageAndDownload(pageUrls[0])

  //   await page.screenshot({
  //     path: 'screenshots/screenshots.png',
  //     fullPage: true
  //   });
  //   await browser.close();

})()