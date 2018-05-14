const path = require('path')
const cheerio = require('cheerio')
const emailRemoveUnusedCss = require('email-remove-unused-css')
const he = require('he')
const juice = require('juice')
const { minify } = require('html-minifier')
const Promise = require('bluebird')

const config = require('./config')
const logger = require('./logger')
const ImageSize = require('./image-size')
const utils = require('./utils')

const cheerioOpts = {
  decodeEntities: false
}

class Build {
  constructor(tplPath) {
    this.tplPath = tplPath
    this.tplName = path.parse(tplPath).base
    this.imageSize = new ImageSize(tplPath)
  }

  go() {
    return this.get()
      .then(this.saveEmails.bind(this))
      .catch(err => {
        logger.error(err)
      })
  }

  get() {
    const nunjucks = utils.requireAndInit('nunjucks', this.tplPath)
    const styles = utils.requireAndInit('styles', this.tplPath)

    const promises = [nunjucks.get(), styles.get()]

    return Promise.all(promises)
      .then(([{ html, text }, css]) => {
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

  generateProdHtml(html, { head, inline }) {
    const $ = cheerio.load(html, cheerioOpts)
    this.defaultAttrs($)
    this.emptyCells($)
    this.injectHeadStyles($, head)
    this.injectInlineStyles($, inline)

    return this.imageSize.setAll($, true).then($ => {
      let html = $.html()

      html = this.removeUnusedCss(html)

      const minifiedHtml = minify(html, {
        removeComments: true,
        removeCommentsFromCDATA: true,
        removeCDATASectionsFromCDATA: true,
        collapseWhitespace: true,
        minifyCSS: true
      })

      return this.fixDynamicHrefs(minifiedHtml)
    })
  }

  generateDevHtml(html, { customResets }) {
    const $ = cheerio.load(html, cheerioOpts)

    const getStyleFilename = style => {
      return config.files[style].replace('.scss', '.css')
    }

    const getStylesheet = styleName => {
      let filePath

      // if this is the main stylesheet or
      // if this is a custom reset stylesheet
      if (styleName === 'styles' || customResets[styleName]) {
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

    const headStylesheet = getStylesheet('resetHead')
    const inlineStylesheet = getStylesheet('resetInline')
    const stylesStylesheet = getStylesheet('styles')

    this.defaultAttrs($)
    this.emptyCells($)

    // TODO: move to separate function
    $('head')
      .append('\n<!-- BEGIN DEVELOPMENT VERSION STYLESHEET INJECTS -->\n')
      .append(headStylesheet)
      .append(inlineStylesheet)
      .append(stylesStylesheet)
      .append('\n<!-- END DEVELOPMENT VERSION STYLESHEET INJECTS -->\n\n')

    return this.imageSize.setAll($).then($ => $.html())
  }

  injectHeadStyles($, styles) {
    if (!$('head style').length) {
      $('head').append('<style type="text/css"></style>')
    }

    $('head style').append(styles)

    return $
  }

  setDoctype(html) {
    // enforce doctype specified in the config
    // strip the existing doctype if it exists
    html = html.trim().replace(/^<!doctype(.*?)>(\s*)/i, '')
    return `${config.doctype}\n${html}`
  }

  injectInlineStyles($, styles) {
    // inline styles using Juice and clean up extra whitespace
    const opts = {
      applyAttributesTableElements: true,
      applyHeightAttributes: true,
      applyWidthAttributes: true
    }
    juice.inlineDocument($, styles, opts)
    return $
  }

  fixDynamicHrefs(html) {
    const regex = /(.*?)&quot;(.*?)&quot;(.*?)/
    return html.replace(/href="{{(.*?)}}"/g, (match, href) => {
      if (!href.match(regex)) return `href="{{${href}}}"`
      return href.replace(regex, (match, p1, p2, p3) => {
        return `href='{{${p1}"${p2}"${p3}}}'`
      })
    })
  }

  defaultAttrs($) {
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

  emptyCells($) {
    $('td').each(function() {
      if (
        !$(this)
          .html()
          .trim()
      ) {
        $(this).html('&nbsp;')
      }
    })

    return $
  }

  cleanTextSpecialChars(text) {
    return (
      // replace non-ASCII characters with ASCII equivalents
      // removes any remaining non-ASCII characters
      // eslint-disable-line no-control-regex
      he
        .decode(text)
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u2026]/g, '...')
        .replace(/[^\x00-\x7F]/g, '')
    )
  }

  removeUnusedCss(html) {
    return emailRemoveUnusedCss(html, {
      whitelist: ['#outlook', '.ExternalClass', '.ReadMsgBody', '#preview_text']
    }).result
  }

  saveEmails() {
    const promises = [
      utils.saveEmail(this.html, this.tplName, 'html'),
      utils.saveEmail(this.htmlDev, this.tplName, 'dev.html'),
      utils.saveEmail(this.text, this.tplName, 'txt')
    ]

    return Promise.all(promises).catch(err => {
      logger.error(err)
    })
  }
}

module.exports = Build
