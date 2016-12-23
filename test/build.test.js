import test from 'ava'
import cache from 'memory-cache'
import cheerio from 'cheerio'

import BuildLib from '../lib/build'

cache.put('config', { doctype: '<!DOCTYPE correct>' })
const newBuild = () => new BuildLib('templates/example')

const newHtml = (body = '', head = '') => (
    `<html><head>${head}</head><body>${body}</body></html>`
)

test('injectHeadStyles', t => {
    const Build = newBuild()
    const $ = cheerio.load(newHtml())
    const styles = '.selector { color: blue; }'
    const result = Build.injectHeadStyles($, styles)
    const expected = newHtml('', '<style type="text/css">.selector { color: blue; }</style>')
    t.deepEqual(result.html(), expected)
})

test('setDoctype', t => {
    const Build = newBuild()
    const html = `  <!DOCTYPE html>${newHtml()}`
    const result = Build.setDoctype(html)
    const expected = `<!DOCTYPE correct>\n${newHtml()}`
    t.deepEqual(result, expected)
})

test('injectInlineStyles', t => {
    const Build = newBuild()
    const $ = cheerio.load('<img src="a.jpg" class="box">')
    const styles = '.box { color: blue; height: 20px; width: 30px; }'
    const result = Build.injectInlineStyles($, styles)
    const expected = '<img src="a.jpg" class="box" style="color: blue; height: 20px; width: 30px;" width="30" height="20">'
    t.deepEqual(result.html(), expected)
})

test('cleanHTMLSpecialChars', t => {
    const Build = newBuild()
    const html = newHtml('“”')
    const result = Build.cleanHTMLSpecialChars(html)
    const expected = newHtml('&#8220;&#8221;')
    t.deepEqual(result, expected)
})

test('cleanSpecialTextChars', t => {
    const Build = newBuild()
    const text = '“”‘’…–—'
    const result = Build.cleanTextSpecialChars(text)
    const expected = '""\'\'...--'
    t.deepEqual(result, expected)
})

test('defaultAttrs: table', t => {
    const Build = newBuild()
    const $ = cheerio.load('<table><tr><td>test</td></tr></table>')
    const result = Build.defaultAttrs($)
    const expected = '<table cellpadding="0" cellspacing="0" border="0"><tr><td>test</td></tr></table>'
    t.deepEqual(result.html(), expected)
})

test('defaultAttrs: img', t => {
    const Build = newBuild()
    const $ = cheerio.load('<img src="a.jpg">')
    const result = Build.defaultAttrs($)
    const expected = '<img src="a.jpg" border="0">'
    t.deepEqual(result.html(), expected)
})

test('defaultAttrs: special characters', t => {
    const Build = newBuild()
    const $ = cheerio.load(newHtml('©®™'))
    const result = Build.defaultAttrs($)
    const expected = newHtml('&#xA9;&#xAE;&#x2122;')
    t.deepEqual(result.html(), expected)
})

test('setImageDimensions: http (good)', async t => {
    const Build = newBuild()
    const url = 'http://24.media.tumblr.com/tumblr_lmighzVWof1qczr0io1_250.gif'
    const $ = cheerio.load(`<img src="${url}" width="20">`)
    const result = await Build.setImageDimensions($)
    const expected = `<img src="${url}" width="250" height="129">`
    t.deepEqual(result.html(), expected)
})

test('setImageDimensions: http (bad)', async t => {
    const Build = newBuild()
    const url = 'http://24.media.tumblr.com/nope.gif'
    const $ = cheerio.load(`<img src="${url}">`)
    const result = await Build.setImageDimensions($)
    const expected = `<img src="${url}">`
    t.deepEqual(result.html(), expected)
})

test('setImageDimensions: relative (good)', async t => {
    const Build = newBuild()
    const url = 'kitten.jpg'
    const $ = cheerio.load(`<img src="${url}">`)
    const result = await Build.setImageDimensions($)
    const expected = `<img src="${url}" width="357" height="421">`
    t.deepEqual(result.html(), expected)
})

test('setImageDimensions: relative (bad)', async t => {
    const Build = newBuild()
    const url = 'nope.jpg'
    const $ = cheerio.load(`<img src="${url}">`)
    const result = await Build.setImageDimensions($)
    const expected = `<img src="${url}">`
    t.deepEqual(result.html(), expected)
})

test('setImageDimensions: mixture', async t => {
    const Build = newBuild()
    const html = `
        <img src="kitten.jpg">
        <img src="nope.jpg">
        <img src="http://24.media.tumblr.com/tumblr_lmighzVWof1qczr0io1_250.gif">
        <img src="http://24.media.tumblr.com/nope.gif">
    `
    const $ = cheerio.load(html)
    const result = await Build.setImageDimensions($)
    const expected = `
        <img src="kitten.jpg" width="357" height="421">
        <img src="nope.jpg">
        <img src="http://24.media.tumblr.com/tumblr_lmighzVWof1qczr0io1_250.gif" width="250" height="129">
        <img src="http://24.media.tumblr.com/nope.gif">
    `
    t.deepEqual(result.html().trim(), expected.trim())
})
