import test from 'ava'
import cheerio from 'cheerio'

import config from '../lib/config'
import BuildLib from '../lib/build'

const newBuild = () => new BuildLib('templates/example')

const newHtml = (body = '', head = '') =>
  `<html><head>${head}</head><body>${body}</body></html>`

test('injectHeadStyles', t => {
  const Build = newBuild()
  const $ = cheerio.load(newHtml())
  const styles = '.selector { color: blue; }'
  const result = Build.injectHeadStyles($, styles)
  const expected = newHtml(
    '',
    '<style type="text/css">.selector { color: blue; }</style>'
  )
  t.deepEqual(result.html(), expected)
})

test('setDoctype', t => {
  const Build = newBuild()
  const html = `  <!DOCTYPE html>${newHtml()}`
  const result = Build.setDoctype(html)
  const expected = `${config.doctype}\n${newHtml()}`
  t.deepEqual(result, expected)
})

test('injectInlineStyles', t => {
  const Build = newBuild()
  const $ = cheerio.load('<img src="a.jpg" class="box">')
  const styles = '.box { color: blue; height: 20px; width: 30px; }'
  const result = Build.injectInlineStyles($, styles)
  const expected =
    '<img src="a.jpg" class="box" style="color: blue; height: 20px; width: 30px;" width="30" height="20">'
  t.deepEqual(result.html(), expected)
})

test('cleanSpecialTextChars', t => {
  const Build = newBuild()
  const text = '“”‘’…–—&apos;'
  const result = Build.cleanTextSpecialChars(text)
  const expected = "\"\"''...--'"
  t.deepEqual(result, expected)
})

test('defaultAttrs: table', t => {
  const Build = newBuild()
  const $ = cheerio.load('<table><tr><td>test</td></tr></table>')
  const result = Build.defaultAttrs($)
  const expected =
    '<table cellpadding="0" cellspacing="0" border="0"><tr><td>test</td></tr></table>'
  t.deepEqual(result.html(), expected)
})

test('defaultAttrs: img', t => {
  const Build = newBuild()
  const $ = cheerio.load('<img src="a.jpg">')
  const result = Build.defaultAttrs($)
  const expected = '<img src="a.jpg" border="0">'
  t.deepEqual(result.html(), expected)
})

test('defaultAttrs: a', t => {
  const Build = newBuild()
  const $ = cheerio.load('<a href="#">test</a>')
  const result = Build.defaultAttrs($)
  const expected = '<a href="#" target="_blank">test</a>'
  t.deepEqual(result.html(), expected)
})

test('defaultAttrs: special characters', t => {
  const Build = newBuild()
  const $ = cheerio.load(newHtml('©®™'))
  const result = Build.defaultAttrs($)
  const expected = newHtml('&#xA9;&#xAE;&#x2122;')
  t.deepEqual(result.html(), expected)
})

test('fixDynamicHrefs', t => {
  const Build = newBuild()
  const result = Build.fixDynamicHrefs(
    '<a href="{{unsub &quot;https://mysite.com&quot;}}">Unsubscribe</a>'
  )
  const expected = '<a href=\'{{unsub "https://mysite.com"}}\'>Unsubscribe</a>'
  t.deepEqual(result, expected)
})

test('fixDynamicHrefs no replace', t => {
  const Build = newBuild()
  const result = Build.fixDynamicHrefs('<a href="{{someVar}}">Hey</a>')
  const expected = '<a href="{{someVar}}">Hey</a>'
  t.deepEqual(result, expected)
})

test('fixDynamicHrefs complex', t => {
  const Build = newBuild()
  const result = Build.fixDynamicHrefs(
    '<a href="{{someVar}}">Hey</a>test<a href="{{unsub &quot;https://mysite.com&quot;}}">Unsubscribe</a>'
  )
  const expected =
    '<a href="{{someVar}}">Hey</a>test<a href=\'{{unsub "https://mysite.com"}}\'>Unsubscribe</a>'
  t.deepEqual(result, expected)
})

test('emptyCells', t => {
  const Build = newBuild()
  const $ = cheerio.load('<td class="spacer"></td>')
  const result = Build.emptyCells($)
  const expected = '<td class="spacer">&#xA0;</td>'
  t.deepEqual(result.html(), expected)
})

test('emptyCells with whitespace', t => {
  const Build = newBuild()
  const $ = cheerio.load('<td class="spacer">    \n  </td>')
  const result = Build.emptyCells($)
  const expected = '<td class="spacer">&#xA0;</td>'
  t.deepEqual(result.html(), expected)
})

test('emptyCells with img', t => {
  const Build = newBuild()
  const $ = cheerio.load('<td><img src="img/test.png"></td>')
  const result = Build.emptyCells($)
  const expected = '<td><img src="img/test.png"></td>'
  t.deepEqual(result.html(), expected)
})

test('emptyCells with text only', t => {
  const Build = newBuild()
  const $ = cheerio.load('<td>hello</td>')
  const result = Build.emptyCells($)
  const expected = '<td>hello</td>'
  t.deepEqual(result.html(), expected)
})
