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
const html2json = require('html2json').html2json;

const cheerio = require('cheerio');
const tooly = require('tooly/tooly/tooly');

const endpoint = 'https://thepiratesbay.io/search.php?query='
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


    let b = new Browser()
    b.visit(endpoint + query, { runScripts: true }, () => {
        let $ = cheerio.load(b.html());

        let para = $('tr')
        let torrents = []

        let tag = "Name"
        para.each(function (i, elem) {
            let url = $(elem).find('td').find('a').attr('href')
            let meta = $('td[data-title="Name"]').attr('data-title')

            let titles = []

            if (meta === tag) {
                let span = $(elem).find('span')
                span.each(function (i, tag) {
                    titles.push($(tag).text())
                })

            }


            if (tooly.existy(url)) {
                console.log(titles)

                let data = {
                    title: titles[0] || 'Unknown',
                    subtitle: titles[1] || 'Unknown',
                    torrent: url
                }

                torrents.push(data)
            }
        });

        let result = {
            results: torrents
        }

        res.json(result);

        b.destroy();

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