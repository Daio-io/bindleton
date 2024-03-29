'use strict';

const config = Object.freeze({
    PORT: process.env.PORT || 3000,
    CACHE: process.env.CACHE || 0,
    EMAIL: process.env.EMAIL || '',
    CODE: process.env.CODE || ''
});

const http = require('http');
const Express = require('express');
const app = Express();
const Browser = require('zombie');
const shellJS = require('shelljs');
const path = require('path');
const appDir = path.dirname(require.main.filename);

const sharp = require('sharp');
const got = require('got');

const cheerio = require('cheerio');

const tooly = require('tooly/tooly/tooly');

app.get('/status', (_, res) => {
    res.send('OK')
})

app.get('/gym', (_, res) => {
    const result = shellJS.exec(appDir + '/puregym.sh ' + config.EMAIL + ' ' + config.CODE)
    res.json({
        status: 'ok',
        inGym: result.trim(),
        numberInGym: tooly.inty(result.trim())
    })
})


app.get("/image", (rq, res) => {

    let url = rq.query['url']
    let width = tooly.inty(rq.query['width'])
    let height = tooly.inty(rq.query['height'])

    let w = width > 0 ? width : null
    let h = height > 0 ? height : null

    let resizeOptions = { width: w, height: h }

    const bufferPromise = got(url, { timeout: 5000 }).buffer()
    bufferPromise.then((buffer) => {
        sharp(buffer)
            .resize(resizeOptions)
            .webp({ quality: 80 })
            .toBuffer()
            .then((data) => {
                res.set('Content-Type', 'image/webp')
                res.set('Cache-Control', 'public, max-age=2592000, immutable')
                res.status(200).end(data)
            }).catch(ex => {
                console.log(ex)
                res.set('Content-Type', 'image/webp')
                res.status(404).end()
            })
    }).catch(ex => {
        console.log(ex)
        res.set('Content-Type', 'image/webp')
        res.status(404).end()
    })
})

app.get('/bins', (_, res) => {
    const b = new Browser();
    b.visit("https://www.salford.gov.uk/bins-and-recycling/bin-collection-days/your-bin-collections/?UPRN=10091475115", { runScripts: true }, () => {
        let $ = cheerio.load(b.html())

        let firstDate = $('.wastedate').first().text()
        let secondDate = $('.wastedate').eq(1).text()
        let thirdDate = $('.wastedate').eq(2).text()

        let first = $('.wastecollection').first().text();
        let next = $('.wastecollection').eq(1).text();
        let third = $('.wastecollection').eq(2).text();

        let firstImages = $('.centre').first()
        let secondImages = $('.centre').eq(1)
        let thirdImages = $('.centre').eq(2)

        let images1 = []
        $(firstImages).find('img').each((index, item) => {
            let image = "https://www.salford.gov.uk" + $(item).attr('src')
            images1.push(image)
        })

        let images2 = []
        $(secondImages).find('img').each((index, item) => {
            let image = "https://www.salford.gov.uk" + $(item).attr('src')
            images2.push(image)
        })

        let images3 = []
        $(thirdImages).find('img').each((index, item) => {
            let image = "https://www.salford.gov.uk" + $(item).attr('src')
            images3.push(image)
        })

        let result = {
            results: [
                {
                    text: first + " " + firstDate,
                    date: firstDate,
                    images: images1
                },
                {
                    text: next + " " + secondDate,
                    date: secondDate,
                    images: images2
                },
                {
                    text: third + " " + thirdDate,
                    date: thirdDate,
                    images: images3
                }
            ]
        }

        res.json(result);

        b.destroy();
    })

})


const imgLookup = {
    'grey': 'https://www.bury.gov.uk/bury/images/burySystemImages/BinCollectionInformation/bin-grey-web.jpg',
    'brown': 'https://www.bury.gov.uk/bury/images/burySystemImages/BinCollectionInformation/bin-brown-web.jpg',
    'green': 'https://www.bury.gov.uk/bury/images/burySystemImages/BinCollectionInformation/green-bin-small.jpg',
    'blue': 'https://www.bury.gov.uk/bury/images/burySystemImages/BinCollectionInformation/bin-blue-web.jpg'
}

const binsBrowser = new Browser();
app.get('/prestbins', (_, res) => {
    binsBrowser.visit("https://www.bury.gov.uk/index.aspx?articleid=10493&RId=662194&pc=m25%209gj&hn=144&sr=&hn2=", { runScripts: true }, () => {
        let $ = cheerio.load(binsBrowser.html())

        let resultsObj = {

        }

        $('.binRouteDetails').first().find('ul').find('li').each((index, item) => {

            const dateText = $(item).find('strong').first().text()

            const date = Date.parse(dateText)
            var image = ''
            var color = ''
            var text = $(item).text()

            if (text.includes('grey')) {
                image = imgLookup['grey']
                color = 'grey'
                text = 'grey waste bin'
            }
            else if (text.includes('blue')) {
                image = imgLookup['blue']
                color = 'blue'
                text = 'blue bin'
            }
            else if (text.includes('brown')) {
                image = imgLookup['brown']
                color = 'brown'

                text = 'brown bin'
            }
            else if (text.includes('green')) {
                image = imgLookup['green']

                color = 'green'
                text = 'green bin'
            }
            else {
                text = ''
                color = ''
            }

            if (resultsObj[dateText]) {
                resultsObj[dateText].text = resultsObj[dateText].text + ' and ' + text
                resultsObj[dateText].images.push(image)
                resultsObj[dateText].colors.push(color)
            }
            else if (text !== '')
                resultsObj[dateText] = {
                    text: 'Next collection on ' + dateText + ' will be ' + text,
                    date: dateText,
                    timeStamp: date,
                    images: [image],
                    colors: [color]
                }
        })

        const results = []

        for (let [key, value] of Object.entries(resultsObj)) {
            results.push(value)
        }

        results.sort(function(a, b){return a.timeStamp - b.timeStamp});

        // let currentMonth = $('.monthTable').first()
        // let date = $(currentMonth).find('caption').first().text().trim()

        // $(currentMonth).find('.DateCol').each((index, item) => {
        //     console.log($(item).text())
        // })

        // $(currentMonth).find('.BinCol').each((index, item) => {
        //     $(item).find('img').each((index, img) => {
        //         console.log($(img).attr('src'))
        //     })
        // })


        res.json({ results: results });
    })
})

const Nintendo = {
    "sega": "https://en.wikipedia.org/wiki/Category:Nintendo_Switch_Online_Sega_Genesis_games",
    "nes": "https://en.wikipedia.org/wiki/Category:Nintendo_Switch_Online_NES_games",
    "snes": "https://en.wikipedia.org/wiki/Category:Nintendo_Switch_Online_SNES_games",
    "n64": "https://en.wikipedia.org/wiki/Category:Nintendo_Switch_Online_Nintendo_64_games"
}

app.get('/nintendo/games/:console', (req, res) => {
    const b = new Browser();
    const console = req.params.console
    const url = Nintendo[console]

    if (!tooly.existy(url)) {
        res.status = 404
        res.json({ status: "failed", console: "", games: [] })
        return
    }

    b.visit(url, { runScripts: false, silent: true }, () => {
        let $ = cheerio.load(b.html())

        const results = []

        $('#mw-pages > div > div').find("ul").find("li").find("a").each((index, item) => {
            results.push($(item).attr('title'))
        })

        res.json({
            status: 'success',
            console: console,
            games: results
        });

        b.destroy();
    })
})


const server = http.createServer(app);

server.listen(config.PORT, () => {
    console.log('Bins started on:', config.PORT);
})