const puppeteer = require('puppeteer');
var mergImg = require('merge-img')
var site = 'http://www.bonhams.com'
var fs = require('fs')

let scrape_info = async (browser, url) => {
    
    const page = await browser.newPage();
    await page.goto(url, {waitUntil:'networkidle2', timeout:30000});
    let lot = url.split('auctions/')
    lot = lot[1].replace(/\//g,'_')
    let path_img = ''
    let path_title = ''
    let path_texte = ''
    let path_desc = ''
    let img_finale = '';
    
     	const img = await page.$('img.autogallery.clickable')
	    if (img != null){
	        await img.screenshot({
	            path: './screen/screenshot_' + lot + '_img.png'
	        })
	        path_img = './screen/screenshot_' + lot + '_img.png'
	        console.log("saved : ", path_img )
	    }

	    const title = await page.$('.firstLine')
	    if (title != null){
	        await title.screenshot({
	            path: './screen/screenshot_' + lot + '_title.png'
	        })
	        path_title = './screen/screenshot_' + lot + '_title.png'
	        console.log("saved : ", path_title)
	    }

	    const texte = await page.$('#footnotes_list > li')
	    if (texte != null){
	        await texte.screenshot({
	            path: './screen/screenshot_' + lot + '_texte.png'
	        })
	        path_texte = './screen/screenshot_' + lot + '_texte.png'
	        console.log("saved : ", path_texte)
	    }

	    const desc = await page.$('.LotDesc')
	    if (desc != null){
	        await desc.screenshot({
	            path: './screen/screenshot_' + lot + '_description.png'
	        })
	        path_desc = './screen/screenshot_' + lot + '_description.png'
	        console.log("saved : ", path_desc)
	    }



	    //tente de merge path1 et path2 sur targetpath et renvoit target path si succes ou un chemin existant
	    async function merge( path1, path2, target_path, option, callback){
	    	if (path1 !== '' && path2 !== ''){
	    		await mergImg([ path1, path2], {direction: option}).then( (img) => {
	    			img.write(target_path, () => {callback(target_path)})
	    		})
	    	}else if (path1 !== ''){
	    		callback(path1)
	    	}else if (path2 !== ''){
	    		callback(path2)
	    	}else {
	    		callback(undefined)
	    	}
	    }

	    var target_path = './screen_final/out'+lot+'.png'

    	await merge(path_desc, path_texte, target_path, true, async (path)=> {  //merge textes en vertical
			await merge(path_img, path, target_path, false, async(path)=>{	//merge image à gauche
					return 1
				})
			})
    			

    await page.close()
    return 1;
}



let scrape_page = async (browser, page) => { //get url on a page

	console.log('scrape page')

    const result = await page.evaluate(() => {
    	var site = 'http://www.bonhams.com'
    	let data = []
    	let elements = document.querySelectorAll('.detail.ng-scope');

        for (var element of elements){ // Loop through each proudct
        	var url = site + element.children[0].getAttribute('href')
        	data.push(url)
        }
        return data
    })
    return result;
};





let scrape_site = async (page, retry) => { //ouvre un browser et s'occupe d'un url
    console.log('scrape site')
    const browser = await puppeteer.launch({headless: true});

    var current_url = await page.evaluate(() => window.location.href)
    console.log('actual url : ', current_url)

    //ensuite etudier la page de resultats
    var result_scrape_site = await scrape_page(browser, page).then(async (result) => {
    	console.log('resultats sur page : ',result.length)
        if (result.length !== 0){
            //si y'a des resultats, un nouveau browser s'en occupe  
            //const browser_infos = await puppeteer.launch({headless: true});
            const promises_infos=[]
            for (var element of result){
            	promises_infos.push( scrape_info(browser, element) )
            }
            await Promise.all(promises_infos)
            console.log('done!')

            //if success => go next page
            var selectorNextPage = '#items > div.Search.module_content > div.ng-scope > div:nth-child(4) > div.pagination.ng-isolate-scope > a:nth-child(8)'
            var next_page = await page.$(selectorNextPage)
                if (next_page != undefined ){
                    try{
                        await page.click(selectorNextPage)
                        await page.waitForNavigation({"waituntil": 'domcontentloaded'})
                        browser.close()
                        await scrape_site(page, true)
                        return 1;  //success
                    }catch(err){
                        console.log('next_page != undefined but can\'t be reached : ', err)
                        console.log('return : 0')
                        browser.close();
                        return 0;
                    }

                }else{  //next_page === undefined
                	console.log('no more pages => end')
                	browser.close();
                    return 0;
                }
        //si pas de resultats : try again
        }else if (retry){
            console.log('no result, will try again')
            scrape_site(page, false)
            browser.close();
            return 0;
        }else{  //si éeme fois pas de resultat : stop
            console.log('second try failed ==> exit');
            browser.close();
            return 0;
        }   
        
    })//end scrape page
    browser.close();
    return result_scrape_site
}



let Mainscrape = async (url) => {
    console.log("processing...")
    if (!fs.existsSync('./screen')){
        fs.mkdirSync('./screen');
    }
    if (!fs.existsSync('./screen_final')){
        fs.mkdirSync('./screen_final');
    }
    //launch first browser
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    page.setViewport({ width: 1280, height: 926})
    await page.goto(url, {"waitUntil": "networkidle2"});
    //var page_max = 1;
    //var last_page = await page.$('#items > div.Search.module_content > div.ng-scope > div:nth-child(4) > div.pagination.ng-isolate-scope > a:nth-child(9)')
    
    //try to display 50 result
    try{await page.click('#items > div.Search.module_content > div.ng-scope > div:nth-child(4) > div.results_per_page > span:nth-child(3) > a')
    	await page.waitForNavigation({"waituntil": 'domcontentloaded'})
    }catch(e){
    	console.log('can\'t display 50 result per page \n', e)
    }finally{

    //appel recursif a scrape_site
    await scrape_site(page, true).then( (retour) => {
        browser.close()
        console.log('scrape_site exited : ', retour)
        return(1)
    }) 
	
	}//end finally

}


    //await page.waitFor(3000)
    /*if (last_page){
        await page.click('#items > div.Search.module_content > div.ng-scope > div:nth-child(4) > div.pagination.ng-isolate-scope > a:nth-child(9)')
        const nb_page = await page.evaluate(async () => {
            var data = document.querySelector('#items > div.Search.module_content > div.ng-scope > div:nth-child(4) > div.pagination.ng-isolate-scope > a.pagination.ng-binding.ng-scope.active').innerText
            return data
        })
        page_max = parseInt(nb_page);
        console.log('page à parser : ', page_max)
    }*/
    
    
    

/*        await scrape_site(true, page).then(async () => {
            var next_page = await page.$('#items > div.Search.module_content > div.ng-scope > div:nth-child(4) > div.pagination.ng-isolate-scope > a:nth-child(8)')
            if (next_page){
                await page.click('#items > div.Search.module_content > div.ng-scope > div:nth-child(4) > div.pagination.ng-isolate-scope > a:nth-child(8)')
            }else{
                next = false;
            }
        })*/
    


//croix : 
//#ModuleRef2 > div.accountlogin_user.hide > div > div.bold.uppercase.login_heading > a


//var url = 'http://www.bonhams.com/search/#/ah0_0=lot&q0=jeanne&MR0_display=search&m0=0'
//var url = 'http://www.bonhams.com/search/#/q0=merlin&MR0_display=search&m0=0'  //550
//var url = 'http://www.bonhams.com/search/#/ah0_0=lot&q0=serge&MR0_display=search&m0=0'  //410
var url = 'http://www.bonhams.com/search/#/ah0_0=lot&q0=sergio&MR0_display=search&m0=0'  //219
//var url = 'http://www.bonhams.com/search/#/ah0_0=lot&q0=sergi&MR0_display=search&m0=0'  //3


console.time("executionTime")
console.log('start timer')

Mainscrape(url).then((result) => {
    console.timeEnd("executionTime")
    console.log(result)
})


/*
Reste a faire :
  recuperer image
  mettre resultat en forme


/*

//div contenant les resultats
#items > div.Search.module_content > div.ng-scope

// 1 element :
#items > div.Search.module_content > div.ng-scope > div:nth-child(3) > div > div > div:nth-child(1)
  -> 10 items

//titre d'un element :
#items > div.Search.module_content > div.ng-scope > div:nth-child(3) > div > div > div:nth-child(1) > div > div:nth-child(1) > a > p:nth-child(1) > div

*/