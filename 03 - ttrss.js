const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');



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
					resolve()
				}
			}
			// 开始下载图片
			imgUrls.forEach((e, i) => {
				axios.get(e, {
					responseType: 'stream'
				})
					.then(res => {
						const fileName = `./ttrss/${title}/${i}.${e.substr(e.length-3)}`
						const write = fs.createWriteStream(fileName);
						write.on('close', () => {
							successNum ++
							checkFinished()
							console.log(`👌 下载成功`);
						});
						res.data.pipe(write);
					})
					.catch(err => {
						badNum ++
						checkFinished()
						console.log(`🚫 下载失败`);
					})
			});
		})
	}



	// 打开一个文章页面 并且下载这个页面上的图片
	// 只适用于没有分页的文章页
	const openPageAndDownload = async (prop) => {
		return new Promise(async (resolve, reject) => {
			// 跳转到文章页
			await page.goto(prop.href);
			// 获取文章标题
			const title = await page.evaluate(() => {
				let titleSelector = 'h1.article-title a';
				let titleDom = [...document.querySelectorAll(titleSelector)];
				return titleDom[0].innerHTML;
			})
			// 在文章页上获取图片地址列表
			let imgUrls = await page.evaluate(() => {
				let selector = 'article.article-content img';
				let dom = [...document.querySelectorAll(selector)];
				return dom.map(e => e.src);
			})
			// 创建文件目录
			const dir = prop.title
			if (!fs.existsSync('./ttrss/' + dir)) {
				fs.mkdirSync('./ttrss/' + dir);
			}
			// 下载图片
			downloadImages(imgUrls, dir)
				.then(resolve)
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
			// 接下来要处理的是首页
			if (nowPageIndex === 1) {
				const list = await getArticleUrl(homePage);
				nowPageIndex ++
				console.log(list.map(e => e.title))
				nextPage()
			} else {
				const list = await getArticleUrl(`${otherPage}${nowPageIndex}`);
				nowPageIndex ++
				console.log(list.map(e => e.title))
				nextPage()
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