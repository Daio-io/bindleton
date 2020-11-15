'use strict';

const Browser = require('zombie');
const cheerio = require('cheerio');
const tooly = require('tooly');

const b = new Browser();
b.visit("https://thepiratesbay.io/search.php?query=family+guy", { runScripts: true }, () => {
    let $ = cheerio.load(b.html());

    let para = $('tr')
    let stations = []

    let tag = "Name"
    para.each(function (i, elem) {
        let url = $(elem).find('td').find('a').attr('href')
        // let meta = $(elem).find('td').attr('data-title')
        let meta = $('td[data-title="Name"]').attr('data-title')

        // console.log(url, meta)

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
                torren: url
            }

            stations.push(data)
        }
    });

});