'use strict'

const path          = require('path')
const cache         = require('memory-cache')
const cheerio       = require('cheerio')
const Entities      = require('html-entities').AllHtmlEntities
const juice         = require('juice')
const minify        = require('html-minifier').minify
const Promise       = require('bluebird')

const logger        = require('./logger.js')
const utils         = require('./utils.js')

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

    const that = this

    return Promise.all(promises)
        .then(function(compiled) {

            const html = compiled[0].html
            const text = compiled[0].text
            const css  = compiled[1]

            that.generateProdHtml(html, css)
            that.generateDevHtml(html, css)
            that.text = text

            that.cleanSpecialChars()

            const emails = {
                html: that.html,
                htmlDev: that.htmlDev,
                text: that.text
            }

            return emails

        })
        .catch(err => {
            logger.error(err)
        })

}

Build.prototype.generateProdHtml = function(html, css) {

    html = this.injectHeadStyles(html, css.head)
    html = this.injectInlineStyles(html, css.inline)

    html = minify(html, {
        removeComments: true,
        removeCommentsFromCDATA: true,
        removeCDATASectionsFromCDATA: true,
        collapseWhitespace: true
    })

    html = this.setDoctype(html)
    this.html = html

    return this.html

}

Build.prototype.generateDevHtml = function(html, css) {

    const $ = cheerio.load(html)
    const that = this

    function getStyleFilename(style) {
        return that.config.files[style].replace('.scss', '.css')
    }

    function getStylesheet(styleName) {

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
        const stylesheet = $('<link/>').attr({
            rel: 'stylesheet',
            type: 'text/css',
            href: filePath
        })

        return stylesheet

    }

    const headStylesheet   = getStylesheet('resetHead')
    const inlineStylesheet = getStylesheet('resetInline')
    const stylesStylesheet = getStylesheet('styles')

    $('head')
        .append('\n<!-- BEGIN DEVELOPMENT VERSION STYLESHEET INJECTS -->\n')
        .append(headStylesheet)
        .append(inlineStylesheet)
        .append(stylesStylesheet)
        .append('\n<!-- END DEVELOPMENT VERSION STYLESHEET INJECTS -->\n\n')

    this.htmlDev = $.html()
    this.htmlDev = this.setDoctype(this.htmlDev)

    return this.htmlDev

}

Build.prototype.injectHeadStyles = function(html, styles) {

    const $ = cheerio.load(html)

    if (!$('head style').length) {
        $('head').append('<style type="text/css"></style>')
    }

    $('head style').append(styles)

    return $.html()

}

Build.prototype.setDoctype = function(html) {
    // enforce doctype specified in the config
    // strip the existing doctype if it exists
    html = html.replace(/^<!doctype(.*?)>(\s*)/i, '')
    html = `${this.config.doctype}\n${html}`
    return html
}

Build.prototype.injectInlineStyles = function(html, styles) {
    // inline styles using Juice and clean up extra whitespace
    html = juice.inlineContent(html, styles).trim()
    html = html.trim()
    return html
}

Build.prototype.cleanSpecialChars = function() {

    function encodeEntities(html) {
        const entities = new Entities()
        html = entities.encodeNonASCII(html)
        return html
    }

    // convert special characters to HTML entities
    this.html = encodeEntities(this.html)
    this.htmlDev = encodeEntities(this.htmlDev)

    // replace non-ASCII characters with ASCII equivalents
    // removes any remaining non-ASCII characters
    this.text = this.text
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
