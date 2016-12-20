import test from 'ava'
import cache from 'memory-cache'

import BuildLib from '../lib/build'

cache.put('config', { doctype: '<!DOCTYPE correct>' })
const newBuild = () => new BuildLib('../templates/example')

const newHtml = (body = '', head = '') => (
    `<html><head>${head}</head><body>${body}</body></html>`
)

test('injectHeadStyles', t => {
    const Build = newBuild()
    const html = newHtml()
    const styles = '.selector { color: blue; }'
    const result = Build.injectHeadStyles(html, styles)
    const expected = newHtml('', '<style type="text/css">.selector { color: blue; }</style>')
    t.deepEqual(result, expected)
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
    const html = newHtml('<img src="a.jpg" class="box">')
    const styles = '.box { color: blue; height: 20px; width: 30px; }'
    const result = Build.injectInlineStyles(html, styles)
    const expected = newHtml('<img src="a.jpg" class="box" style="color: blue; height: 20px; width: 30px;" width="30" height="20">')
    t.deepEqual(result, expected)
})

test('cleanSpecialChars', t => {
    const Build = newBuild()
    Build.html = '“”'
    Build.htmlDev = ''
    Build.text = ''
    Build.cleanSpecialChars()
    const expected = '&#8220;&#8221;'
    t.deepEqual(Build.html, expected)
})

test('defaultAttrs: table', t => {
    const Build = newBuild()
    const html = newHtml('<table><tr><td>test</td></tr></table>')
    const result = Build.defaultAttrs(html)
    const expected = newHtml('<table cellpadding="0" cellspacing="0" border="0"><tr><td>test</td></tr></table>')
    t.deepEqual(result, expected)
})

test('defaultAttrs: img', t => {
    const Build = newBuild()
    const html = newHtml('<img src="a.jpg">')
    const result = Build.defaultAttrs(html)
    const expected = newHtml('<img src="a.jpg" border="0">')
    t.deepEqual(result, expected)
})
