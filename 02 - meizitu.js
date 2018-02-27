const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
var currentNumber = 1;

async function run(url) {
    console.log('开始爬图');
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();
    await page.goto(url);

    let imgURL = await page.evaluate(() => {
        let imgURL = []
        let selector = 'a.view_img_link';
        let imgUrlList = [...document.querySelectorAll(selector)];
        imgUrlList.forEach(e => {
            imgURL.push(e.href)
        })
        return imgURL
    });
    imgURL.forEach((e, i) => {
        if (currentNumber === 200) {
            browser.close();
            console.log('下载完毕')
            return
        }
        axios.get(e, {
            responseType: 'stream'
        })
            .then(res => {
                res.data.pipe(fs.createWriteStream(`./meizi/${currentNumber}.${e.substr(e.length-3)}`));
                currentNumber++;
            })
            .catch(err => {
                console.log(err)
            })
    });
    let nextPage = await page.evaluate(() => {
        return document.querySelectorAll('#comments > div:nth-child(4) > div > a.previous-comment-page')[0].href;
    })
    await page.close();
    console.log('本页处理完毕!');
    setTimeout(function() {
        run(nextPage)
    }, 3000);
}
run('http://jandan.net/ooxx');