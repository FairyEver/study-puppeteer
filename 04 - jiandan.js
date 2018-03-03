const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');

// https://github.com/visionmedia/node-progress
const ProgressBar = require('progress')
// https://www.npmjs.com/package/colors
const colors = require('colors');

(async () => {
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(100000);

    await page.goto('http://es6.ruanyifeng.com/#docs/regex', {
        waitUntil: 'domcontentloaded'
    });
})()
