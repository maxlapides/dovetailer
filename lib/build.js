const http     = require('http')
const https    = require('https')
const path     = require('path')
const url      = require('url')
const _        = require('lodash')
const cache    = require('memory-cache')
const cheerio  = require('cheerio')
const Entities = require('html-entities').AllHtmlEntities
const fse      = require('fs-extra')
const juice    = require('juice')
const minify   = require('html-minifier').minify
const Promise  = require('bluebird')
const sizeOf   = require('image-size')

const logger   = require('./logger.js')
const utils    = require('./utils.js')

Promise.promisifyAll(fse)

// used for caching image dimensions
const queue = []
const imgPromises = {}
let imgCache
let addingImgToCache = false

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

    return this.setImageDimensions($, true).then($ => (
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

Build.prototype.setImageDimensions = function($, isProd) {

    const getImageSize = src => {
        return _getImageSizeCache(src)
            .then(cachedImgSize => {

                // check the cache first
                if (cachedImgSize) {
                    return cachedImgSize
                }

                // then check if it's an HTTP URL
                if (url.parse(src).protocol) {
                    return _getImageSizeHTTP(src)
                }

                // otherwise check local filesystem
                return _getImageSizeRelative(src)

            })
            .then(dimensions => {
                const imgPath = path.parse(src)
                const imgName = imgPath.name
                const imgBase = imgPath.base

                // handle retina images
                if (_.endsWith(imgName, '@2x')) {
                    _retinaWarning(imgBase, dimensions, 2)
                    return {
                        width: Math.floor(dimensions.width / 2),
                        height: Math.floor(dimensions.height / 2)
                    }
                }
                if (_.endsWith(imgName, '@3x')) {
                    _retinaWarning(imgBase, dimensions, 3)
                    return {
                        width: Math.floor(dimensions.width / 3),
                        height: Math.floor(dimensions.height / 3)
                    }
                }

                return dimensions
            })
    }

    const _retinaWarning = (imgName, dimensions, mod) => {
        if (dimensions.width % mod !== 0) {
            logger.warn(`${imgName} is a retina image, but its width ${dimensions.width}px is not divisible by ${mod}`)
        }
        if (dimensions.height % mod !== 0) {
            logger.warn(`${imgName} is a retina image, but its height ${dimensions.height}px is not divisible by ${mod}`)
        }
    }

    const _getImageSizeCache = src => {
        if (imgCache && imgCache[src]) {
            return Promise.resolve(imgCache[src])
        }
        return fse.readJsonAsync(this.config.files.imageCache)
            .then(cache => cache[src])
            .catch(() => false)
    }

    const _getImageSizeHTTP = src => {
        // check to see if we're already fetching this image
        if (imgPromises[src]) {
            return imgPromises[src]
        }

        const that = this
        const get = url.parse(src).protocol === 'https:' ? https.get : http.get

        const promise = new Promise((resolve, reject) => {
            get(src, response => {
                if (response.statusCode !== 200) {
                    response.resume() // consume response data to free up memory
                    return reject()
                }
                const chunks = []
                response
                    .on('data', chunk => chunks.push(chunk))
                    .on('end', () => {
                        const dimensions = sizeOf(Buffer.concat(chunks))
                        that.addToImageCache(src, dimensions)
                        resolve(dimensions)
                    })
            })
        })
        imgPromises[src] = promise
        return promise
    }

    const _getImageSizeRelative = src => {
        // make sure the image exists, then get its size
        const filepath = path.join(process.cwd(), this.tplPath, src)
        return fse.accessAsync(filepath, fse.F_OK).then(() => sizeOf(filepath))
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

                // set inline styles width/height if not already set
                if (isProd) {
                    if (!$img.css('width')) $img.css({ width })
                    if (!$img.css('height')) $img.css({ height })
                }
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

Build.prototype.addToImageCache = function(src, dimensions) {

    if (addingImgToCache) {
        queue.push([src, dimensions])
        return
    }

    const getCache = () => {
        if (imgCache) {
            return Promise.resolve(imgCache)
        }
        return fse.readJsonAsync(this.config.files.imageCache)
            .then(cache => {
                imgCache = cache
                return imgCache
            })
            .catch(() => {
                imgCache = {}
                return imgCache
            })
    }

    addingImgToCache = true

    return getCache()
        .then(cache => {
            if (cache[src] === dimensions) {
                return
            }
            cache[src] = dimensions
            return fse.outputJson(this.config.files.imageCache, cache)
        })
        .then(() => {
            addingImgToCache = false
            if (queue.length) {
                const [ nextSrc, nextDimensions ] = queue.shift()
                return this.addToImageCache(nextSrc, nextDimensions)
            }
        })
}

module.exports = Build
