const path     = require('path')
const cache    = require('memory-cache')
const cheerio  = require('cheerio')
const he       = require('he')
const juice    = require('juice')
const minify   = require('html-minifier').minify
const Promise  = require('bluebird')

const logger    = require('./logger.js')
const ImageSize = require('./image-size')
const utils     = require('./utils.js')

const Build = function(tplPath) {
    this.tplPath = tplPath
    this.tplName = path.parse(tplPath).base
    this.config = cache.get('config')
    this.imageSize = new ImageSize(tplPath)
}

Build.prototype.go = function() {
    return this.get()
        .then(this.saveEmails.bind(this))
        .catch(err => {
            logger.error(err)
        })
}

Build.prototype.get = function() {

    const handlebars = utils.requireAndInit('handlebars', this.tplPath)
    const styles     = utils.requireAndInit('styles', this.tplPath)

    const promises = [
        handlebars.get(),
        styles.get()
    ]

    return Promise.all(promises)
        .then(([ { html, text }, css ]) => {

            // text version
            text = this.cleanTextSpecialChars(text)
            this.text = text

            // enforce doctype
            html = this.setDoctype(html)

            // process HTML
            return Promise.all([
                this.generateProdHtml(html, css),
                this.generateDevHtml(html, css)
            ])

        })
        .then(([htmlProd, htmlDev]) => {

            this.html = htmlProd
            this.htmlDev = htmlDev

            return {
                html: this.html,
                htmlDev: this.htmlDev,
                text: this.text
            }

        })
        .catch(err => {
            logger.error(err)
        })

}

Build.prototype.generateProdHtml = function(html, css) {

    const $ = cheerio.load(html)
    this.defaultAttrs($)
    this.injectHeadStyles($, css.head)
    this.injectInlineStyles($, css.inline)

    return this.imageSize.setAll($, true).then($ => (
        minify($.html(), {
            removeComments: true,
            removeCommentsFromCDATA: true,
            removeCDATASectionsFromCDATA: true,
            collapseWhitespace: true,
            minifyCSS: true
        })
    ))

}

Build.prototype.generateDevHtml = function(html, css) {

    const $ = cheerio.load(html)

    const getStyleFilename = style => {
        return this.config.files[style].replace('.scss', '.css')
    }

    const getStylesheet = styleName => {

        let filePath

        // if this is the main stylesheet or
        // if this is a custom reset stylesheet
        if (styleName === 'styles' || css.customResets[styleName]) {
            filePath = `css/${getStyleFilename(styleName)}`
        }

        // otherwise, this must be a common stylesheet
        else {
            filePath = `../common/${getStyleFilename(styleName)}`
        }

        // build a DOM node for this stylesheet
        return $('<link/>').attr({
            rel: 'stylesheet',
            type: 'text/css',
            href: filePath
        })

    }

    const headStylesheet   = getStylesheet('resetHead')
    const inlineStylesheet = getStylesheet('resetInline')
    const stylesStylesheet = getStylesheet('styles')

    this.defaultAttrs($)

    // TODO: move to separate function
    $('head')
        .append('\n<!-- BEGIN DEVELOPMENT VERSION STYLESHEET INJECTS -->\n')
        .append(headStylesheet)
        .append(inlineStylesheet)
        .append(stylesStylesheet)
        .append('\n<!-- END DEVELOPMENT VERSION STYLESHEET INJECTS -->\n\n')

    return this.imageSize.setAll($).then($ => $.html())

}

Build.prototype.injectHeadStyles = function($, styles) {

    if (!$('head style').length) {
        $('head').append('<style type="text/css"></style>')
    }

    $('head style').append(styles)

    return $

}

Build.prototype.setDoctype = function(html) {
    // enforce doctype specified in the config
    // strip the existing doctype if it exists
    html = html.trim().replace(/^<!doctype(.*?)>(\s*)/i, '')
    return `${this.config.doctype}\n${html}`
}

Build.prototype.injectInlineStyles = function($, styles) {
    // inline styles using Juice and clean up extra whitespace
    const opts = {
        applyAttributesTableElements: true,
        applyHeightAttributes: true,
        applyWidthAttributes: true
    }
    juice.inlineDocument($, styles, opts)
    return $
}

Build.prototype.defaultAttrs = function($) {

    $('table').attr({
        cellpadding: 0,
        cellspacing: 0,
        border: 0
    })

    $('img').attr({
        border: 0
    })

    $('a').attr({
        target: '_blank'
    })

    return $
}

Build.prototype.cleanTextSpecialChars = function(text) {
    // replace non-ASCII characters with ASCII equivalents
    // removes any remaining non-ASCII characters
    return he.decode(text)
        .replace(/[\u2018\u2019]/g, '\'')
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u2026]/g, '...')
        .replace(/[^\x00-\x7F]/g, '') // eslint-disable-line no-control-regex
}

Build.prototype.saveEmails = function() {

    const promises = [
        utils.saveEmail(this.html, this.tplName, 'html'),
        utils.saveEmail(this.htmlDev, this.tplName, 'dev.html'),
        utils.saveEmail(this.text, this.tplName, 'txt')
    ]

    return Promise.all(promises).catch(err => {
        logger.error(err)
    })

}

module.exports = Build
