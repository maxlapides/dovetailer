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
const FileSaver = require('./file-saver')

const cheerioOpts = {
  decodeEntities: false
}

class Build {
  constructor(tplPath, extraContext = {}) {
    this.tplPath = tplPath
    this.tplName = path.parse(tplPath).base
    this.extraContext = extraContext
    this.imageSize = new ImageSize(tplPath)
  }

  async go() {
    try {
      await this.get()
      await this.saveEmails()
    } catch (err) {
      logger.error(err)
    }

    return {
      html: this.html,
      text: this.text
    }
  }

  get() {
    const nunjucks = utils.requireAndInit('nunjucks', this.tplPath)
    const styles = utils.requireAndInit('styles', this.tplPath)

    const promises = [nunjucks.get(this.extraContext), styles.get()]

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
    this.headHacks($)
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
        filePath = `../.common/${getStyleFilename(styleName)}`
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
    this.headHacks($)

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

  headHacks($) {
    // meta tags
    $('head').prepend(`
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">

      <!-- So that mobile will display zoomed in -->
      <meta name="viewport" content="width=device-width, initial-scale=1">

      <!-- enable media queries for windows phone 8 -->
      <meta http-equiv="X-UA-Compatible" content="IE=edge">

      <!-- disable auto date linking in iOS 7-9 -->
      <meta name="format-detection" content="date=no">

      <!-- disable auto telephone linking in iOS 7-9 -->
      <meta name="format-detection" content="telephone=no">

      <!-- prevent iOS 11 from automatically scaling -->
      <meta name="x-apple-disable-message-reformatting">
    `)

    // fix outlook zooming on 120 DPI windows devices
    $('html').attr({
      xmlns: 'http://www.w3.org/1999/xhtml',
      'xmlns:v': 'urn:schemas-microsoft-com:vml',
      'xmlns:o': 'urn:schemas-microsoft-com:office:office'
    })
    const outlookHack = `
      <!--[if gte mso 9]>
        <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG/>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
        </xml>
      <![endif]-->
    `
      .replace(/\s*\n\s*/g, '')
      .trim()
    $('head').prepend(outlookHack)

    return $
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

  // replace non-ASCII characters with ASCII equivalents
  cleanTextSpecialChars(text) {
    return he
      .decode(text)
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2026]/g, '...')
  }

  removeUnusedCss(html) {
    return emailRemoveUnusedCss(html, {
      whitelist: config.whitelistSelectors
    }).result
  }

  saveEmails() {
    return Promise.all([
      FileSaver.saveEmail(this.tplName, 'html', this.html),
      FileSaver.saveEmail(this.tplName, 'dev.html', this.htmlDev),
      FileSaver.saveEmail(this.tplName, 'txt', this.text)
    ])
  }
}

module.exports = Build
