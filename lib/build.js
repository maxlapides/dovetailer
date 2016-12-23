const fs       = require('fs')
const http     = require('http')
const path     = require('path')
const _        = require('lodash')
const cache    = require('memory-cache')
const cheerio  = require('cheerio')
const Entities = require('html-entities').AllHtmlEntities
const juice    = require('juice')
const minify   = require('html-minifier').minify
const Promise  = require('bluebird')
const sizeOf   = require('image-size')

const logger   = require('./logger.js')
const utils    = require('./utils.js')

Promise.promisifyAll(fs)

const Build = function(tplPath) {
    this.tplPath = tplPath
    this.tplName = path.parse(tplPath).base
    this.config = cache.get('config')
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

            // clean up HTML
            html = this.setDoctype(html)
            html = this.cleanHTMLSpecialChars(html)

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

    return this.setImageDimensions($).then($ => (
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

    return this.setImageDimensions($).then($ => $.html())

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

    return $
}

Build.prototype.cleanHTMLSpecialChars = function(html) {
    // convert special characters to HTML entities
    return new Entities().encodeNonASCII(html)
}

Build.prototype.cleanTextSpecialChars = function(text) {
    // replace non-ASCII characters with ASCII equivalents
    // removes any remaining non-ASCII characters
    return text
        .replace(/[\u2018\u2019]/g, '\'')
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u2026]/g, '...')
        .replace(/[^\x00-\x7F]/g, '') // eslint-disable-line no-control-regex
}

Build.prototype.setImageDimensions = function($) {

    const getImageSize = src => {
        if (_.startsWith(src, 'http://') || _.startsWith(src, 'https://')) {
            return _getImageSizeHTTP(src)
        }
        return _getImageSizeRelative(src)
    }

    const _getImageSizeHTTP = src => {
        return new Promise((resolve, reject) => {
            http.get(src, response => {
                if (response.statusCode !== 200)
                    return reject()
                const chunks = []
                response
                    .on('data', chunk => chunks.push(chunk))
                    .on('end', () => {
                        const buf = Buffer.concat(chunks)
                        resolve(sizeOf(buf))
                    })
            })
        })
    }

    const _getImageSizeRelative = src => {
        // make sure the image exists, then get its size
        const filepath = path.join(process.cwd(), this.tplPath, src)
        return fs.accessAsync(filepath, fs.F_OK)
            .then(() => Promise.resolve(sizeOf(filepath)))
    }

    const promises = []

    $('img').each((i, img) => {

        const $img = $(img)

        // stop here if src does not exist
        const src = $img.attr('src').trim()
        if (!src) return

        // stop here if dimensions are already set
        if ($img.attr('width') && $img.attr('height')) return

        const promise = getImageSize(src)
            .then(({ width, height }) => {
                $img.attr({ width, height })
            })
            .catch(() => false) // error: image can't be found, ignore

        promises.push(promise)

    })

    return Promise.all(promises).then(() => $)

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
