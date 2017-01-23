import test from 'ava'
import cache from 'memory-cache'
import cheerio from 'cheerio'
import del from 'del'

import ImageSizeLib from '../lib/image-size'

cache.put('config', {
    files: { imageCache: './cache/images.json' },
    dirs: { build: './build' }
})
const newImageSize = () => new ImageSizeLib('templates/example')

test.before(async () => await del('./cache'))

test('setImageDimensions: http (good)', async t => {
    const ImageSize = newImageSize()
    const url = 'http://24.media.tumblr.com/tumblr_lmighzVWof1qczr0io1_250.gif'
    const $ = cheerio.load(`<img src="${url}" width="20">`)
    const result = await ImageSize.setAll($)
    const expected = `<img src="${url}" width="250" height="129">`
    t.deepEqual(result.html(), expected)
})

test('setImageDimensions: https @2x', async t => {
    const ImageSize = newImageSize()
    const url = 'https://fulcrumtech.net/wp-content/themes/fulcrumtech/library/images/home/field-icons@2x.png'
    const $ = cheerio.load(`<img src="${url}">`)
    const result = await ImageSize.setAll($)
    const expected = `<img src="${url}" width="44" height="28">`
    t.deepEqual(result.html(), expected)
})

test('setImageDimensions: http (bad)', async t => {
    const ImageSize = newImageSize()
    const url = 'http://24.media.tumblr.com/nope.gif'
    const $ = cheerio.load(`<img src="${url}">`)
    const result = await ImageSize.setAll($)
    const expected = `<img src="${url}">`
    t.deepEqual(result.html(), expected)
})

test('setImageDimensions: http (bad domain)', async t => {
    const ImageSize = newImageSize()
    const url = 'http://jasdfasdiennasdilnekendksdunaeucmnxliwndlie.asdfdedx/nope.gif'
    const $ = cheerio.load(`<img src="${url}">`)
    const result = await ImageSize.setAll($)
    const expected = `<img src="${url}">`
    t.deepEqual(result.html(), expected)
})

test('setImageDimensions: relative (good)', async t => {
    const ImageSize = newImageSize()
    const url = 'kitten.jpg'
    const $ = cheerio.load(`<img src="${url}">`)
    const result = await ImageSize.setAll($)
    const expected = `<img src="${url}" width="357" height="421">`
    t.deepEqual(result.html(), expected)
})

test('setImageDimensions: relative (bad)', async t => {
    const ImageSize = newImageSize()
    const url = 'nope.jpg'
    const $ = cheerio.load(`<img src="${url}">`)
    const result = await ImageSize.setAll($)
    const expected = `<img src="${url}">`
    t.deepEqual(result.html(), expected)
})

test('setImageDimensions: relative @2x', async t => {
    const ImageSize = newImageSize()
    const url = 'kitten@2x.jpg'
    const $ = cheerio.load(`<img src="${url}">`)
    const result = await ImageSize.setAll($)
    const expected = `<img src="${url}" width="200" height="250">`
    t.deepEqual(result.html(), expected)
})

test('setImageDimensions: mixture', async t => {
    const ImageSize = newImageSize()
    const html = `
        <img src="kitten.jpg">
        <img src="nope.jpg">
        <img src="http://24.media.tumblr.com/tumblr_lmighzVWof1qczr0io1_250.gif">
        <img src="http://24.media.tumblr.com/nope.gif">
    `
    const $ = cheerio.load(html)
    const result = await ImageSize.setAll($)
    const expected = `
        <img src="kitten.jpg" width="357" height="421">
        <img src="nope.jpg">
        <img src="http://24.media.tumblr.com/tumblr_lmighzVWof1qczr0io1_250.gif" width="250" height="129">
        <img src="http://24.media.tumblr.com/nope.gif">
    `
    t.deepEqual(result.html().trim(), expected.trim())
})
