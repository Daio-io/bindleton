'use strict';

const config = Object.freeze({
    PORT: process.env.PORT || 3000,
    CACHE: process.env.CACHE || 0,
    EMAIL: process.env.EMAIL || '',
    CODE: process.env.CODE || ''
});

const tabletojson = require('tabletojson').Tabletojson;

const http = require('http');
const Express = require('express');
const app = Express();
const Browser = require('zombie');
const shellJS = require('shelljs');
const path = require('path');
const appDir = path.dirname(require.main.filename);
const html2json = require('html2json').html2json;

const sharp = require('sharp');
const got = require('got');

const cheerio = require('cheerio');
const tooly = require('tooly/tooly/tooly');

const endpoint = 'https://thepiratebay.by/search.php?q='
const apikey = '3ec4931a9c'

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

app.get('/links', (rq, res) => {

    let key = rq.query['apikey']
    let query = rq.query['q']

    if (!tooly.existy(key) || key !== apikey) {
        res.json({ status: 'failed: missing apikey' })
        return
    }

    if (!tooly.existy(query)) {
        res.json({ status: 'failed: You must supply a `q` param' })
        return
    }


    let endpoint = `https://thepiratebay.party/search/${query}/1/99/0`
    let b = new Browser()
    b.visit(endpoint, { runScripts: true }, () => {
        let $ = cheerio.load(b.html());

        const result = tabletojson.convert(b.html(), { stripHtmlFromCells: false })

        try {
            let data = result[0].map(function (item) {
                let magnet = $(item['3']).find('a').attr('href')
                var title = ''
                Object.keys(item).forEach(function (key) {
                    if (key.toLowerCase().includes('name')) {
                        title = $(item[key]).attr('title')
                    }
                })

                let size = item['Size']

                return {
                    torrent: magnet,
                    title: title,
                    subtitle: size
                }
            })

            let reso = {
                results: data
            }

            res.json(reso)
            b.destroy();
        } catch (ex) {
            res.send(ex)
            b.destroy();
        }



        // res.json()
        // let para = $('.list-entry')
        // res.send(para.html())

        // let torrents = []

        // let tag = "Name"
        // para.each(function (i, elem) {
        //     let url = $(elem).find('td').find('a').attr('href')
        //     let meta = $('td[data-title="Name"]').attr('data-title')

        //     let titles = []

        //     if (meta === tag) {
        //         let span = $(elem).find('span')
        //         span.each(function (i, tag) {
        //             titles.push($(tag).text())
        //         })

        //     }


        //     if (tooly.existy(url)) {
        //         console.log(titles)

        //         let data = {
        //             title: titles[0] || 'Unknown',
        //             subtitle: titles[1] || 'Unknown',
        //             torrent: url
        //         }

        //         torrents.push(data)
        //     }
        // });

        // let result = {
        //     results: torrents
        // }

        // res.json(result);

        // b.destroy();

    });
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

const server = http.createServer(app);

server.listen(config.PORT, () => {
    console.log('Bins started on:', config.PORT);
});