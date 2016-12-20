import test from 'ava'
import cache from 'memory-cache'

import BuildLib from '../lib/build'

cache.put('config', { doctype: '<!DOCTYPE correct>' })
const newBuild = () => new BuildLib('../templates/example')

test('injectHeadStyles', t => {
    const Build = newBuild()
    const html = '<html><head></head><body></body></html>'
    const styles = '.selector { color: blue; }'
    const result = Build.injectHeadStyles(html, styles)
    const expected = '<html><head><style type="text/css">.selector { color: blue; }</style></head><body></body></html>'
    t.deepEqual(result, expected)
})

test('setDoctype', t => {
    const Build = newBuild()
    const html = '  <!DOCTYPE html><html><head></head><body></body></html>'
    const result = Build.setDoctype(html)
    const expected = '<!DOCTYPE correct>\n<html><head></head><body></body></html>'
    t.deepEqual(result, expected)
})

test('injectInlineStyles', t => {
    const Build = newBuild()
    const html = '<html><head></head><body><div class="box"></div></body></html>'
    const styles = '.box { color: blue; }'
    const result = Build.injectInlineStyles(html, styles)
    const expected = '<html><head></head><body><div class="box" style="color: blue;"></div></body></html>'
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
