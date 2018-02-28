const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');



(async () => {


  
  // 列表页一共多少页
  let listPageTotal = 0
  // 当前正在第几页
  let nowPageIndex = 0
  // 第一页
  let homePage = 'https://ttrss.com/'
  // 从第二页开始的地址格式
  let otherPage = 'https://ttrss.com/page/'



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
      const title = [...document.querySelectorAll('article.excerpt h2 a')]
      const note = [...document.querySelectorAll('article.excerpt p.note')]
      const tagAndDate = [...document.querySelectorAll('article.excerpt p.text-muted span.rightkong')]
      return title.map((e, i) => {
        const tagAndDateText = tagAndDate[i].innerHTML
        const tag = tagAndDateText.match(/\s+[\u4e00-\u9fa5_a-zA-Z0-9]+\s+/g)
        const date = tagAndDateText.match(/\d+-\d+-\d+/g)
        return {
          href: e.href,
          title: e.innerHTML,
          note: note[i].innerHTML,
          tag: tag ? tag[0].trim() : '',
          date: date ? date[0] : ''
        }
      })
    });
    // 如果还没有获取列表页的页数 在这里获取一次
    if (listPageTotal === 0) {
      const tempListPageTotal = await page.evaluate(() => {
        const pageTotalDom = [...document.querySelectorAll('div.pagination ul li:last-child span')]
        return pageTotalDom[0].innerHTML
      })
      listPageTotal = Number(tempListPageTotal.match(/\d+/g)[0])
    }
    // 返回这个页面上的列表链接
    return pageUrls;
  }



  // 打开一个文章页面 并且下载这个页面上的图片
  // 只适用于没有分页的文章页
  const openPageAndDownload = async (prop) => {
    // 跳转到文章页
    await page.goto(prop.href)
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
          res.data.pipe(fs.createWriteStream(`./ttrss/${prop.title}-${i}.${e.substr(e.length-3)}`));
        })
        .catch(err => {
          console.log(`${e} 下载失败`)
        })
    });
  }


  
  const start = async () => {
    // 获取这个页面上文章链接地址
    const list = await getArticleUrl(homePage)
    // console.log(list)
    await openPageAndDownload(list[0])
    await openPageAndDownload(list[1])
    await openPageAndDownload(list[2])
  }



  start()

  

  //   await page.screenshot({
  //     path: 'screenshots/screenshots.png',
  //     fullPage: true
  //   });
  //   await browser.close();

})()