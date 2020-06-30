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

const cheerio = require('cheerio')

app.get('/status', (_, res) => {
    res.send('OK')
})

app.get('/gym', (_, res) => {
    const result = shellJS.exec(appDir + '/puregym.sh ' + config.EMAIL + ' ' + config.CODE)
    res.json({ status: 'ok', inGym: result.trim() })
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