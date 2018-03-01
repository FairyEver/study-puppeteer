const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');

// https://github.com/visionmedia/node-progress
const ProgressBar = require('progress')
// https://www.npmjs.com/package/colors
const colors = require('colors');


var bar = null;



const initDownLoadProgressBar = (total) => {
	bar = new ProgressBar(':bar :current / :total', {
		total
	})
}




(async () => {


	
	// 列表页一共多少页
	let listPageTotal = 0
	// 当前正在第几页
	let nowPageIndex = 1
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



	const downloadImages = (imgUrls, title) => {
		return new Promise((resolve, reject) => {
			// 所有图片的数量
			let allNum = imgUrls.length;
			let successNum = 0;
			let badNum = 0;
			// 检查是否完成
			const checkFinished = () => {
				if (successNum + badNum === allNum) {
					const textSuccess = (badNum === 0 ? '全部下载成功' : `下载成功:${successNum}`).green;
					const textBad = badNum !== 0 ? `失败:${badNum}`.red : ''
					console.log(textSuccess + ' ' + textBad)
					resolve()
				}
			}
			// 开始下载图片
			initDownLoadProgressBar(allNum)
			imgUrls.forEach((e, i) => {
				axios.get(e, {
					responseType: 'stream',
					timeout: 10000
				})
					.then(res => {
						const fileName = `./ttrss/${title}/${i}.${e.substr(e.length-3)}`
						const write = fs.createWriteStream(fileName);
						// write.on('close', () => {
						// 	successNum ++
						// 	checkFinished()
						// 	bar.tick();
						// });
						res.data.pipe(write);
						successNum ++
						bar.tick();
						checkFinished();
					})
					.catch(err => {
						badNum ++
						bar.tick();
						checkFinished();
					})
			});
		})
	}



	// 打开一个文章页面 并且下载这个页面上的图片
	// 只适用于没有分页的文章页
	const openPageAndDownload = async (prop) => {
		return new Promise(async (resolve, reject) => {
			// 判断如果是 ROSI 就跳过
			// const reg = /^每日一拾/
			// if (!reg.test(prop.title)) {
			// 	resolve();
			// 	console.log(`忽略 ${prop.href}`)
			// 	return;
			// }
			// 跳转到文章页
			console.log(`正在打开 “${prop.href}”`)
			await page.goto(prop.href, {
				waitUntil: 'domcontentloaded'
			});
			console.log(`加载完毕 “${prop.href}”`)
			// 获取文章标题
			const title = await page.evaluate(() => {
				let titleSelector = 'h1.article-title a';
				let titleDom = [...document.querySelectorAll(titleSelector)];
				return titleDom[0].innerHTML;
			})
			console.log(`文章名 《${title}》`)
			// 在文章页上获取图片地址列表
			let imgUrls = await page.evaluate(() => {
				let selector = 'article.article-content img';
				let dom = [...document.querySelectorAll(selector)];
				return dom.map(e => e.src);
			})
			console.log(`共有${imgUrls.length}张图片`)
			// 回到首页
			page.goto(homePage)
			// 创建文件目录
			const dir = prop.title
			if (!fs.existsSync('./ttrss/' + dir)) {
				fs.mkdirSync('./ttrss/' + dir);
			}
			console.log(`创建文件目录 “./ttrss/${dir}”`)
			// 下载图片
			console.log('开始下载本页图片')
			await downloadImages(imgUrls, dir);
			resolve();
		})
	}


	
	// 启动
	const start = async () => {
		// 处理一页
		const startOnePage = async () => {
			// 判断是否可以跳转下一页
			const nextPage = () => {
				if (nowPageIndex <= listPageTotal) {
					startOnePage()
				}
			}
			// 根据一个列表打开页面 这个列表应该是文章列表
			const startOpenPageInList = async (list) => {
				console.log(`开始打开${list.length}篇文章`)
				let now = 0
				return new Promise((resolve, reject) => {
					const open = async () => {
						console.log(`正在打开第${now + 1}篇文章`)
						await openPageAndDownload(list[now])
						console.log(`第${now + 1}篇文章处理完成`)
						now ++
						if (now < list.length) {
							open()
						} else {
							resolve()
						}
					}
					open()
				})
			}
			
			if (nowPageIndex === 1) {
				console.log('打开首页')
				const list = await getArticleUrl(homePage);
				console.log(`获取到${list.length}篇文章`)
				nowPageIndex ++
				await startOpenPageInList(list)
				nextPage()
			} else if (nowPageIndex <= listPageTotal) {
				console.log(`打开第${nowPageIndex}页`)
				const list = await getArticleUrl(`${otherPage}${nowPageIndex}`);
				console.log(`获取到${list.length}篇文章`)
				nowPageIndex ++
				await startOpenPageInList(list)
				nextPage()
			} else {
				console.log('👉 结束')
			}
		}
		// 触发递归
		startOnePage()
	}



	console.log('👉 开始')
	start()

	

	//   await page.screenshot({
	//     path: 'screenshots/screenshots.png',
	//     fullPage: true
	//   });
	//   await browser.close();

})()