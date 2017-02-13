const http     = require('http')
const https    = require('https')
const path     = require('path')
const url      = require('url')

const _        = require('lodash')
const cache    = require('memory-cache')
const fse      = require('fs-extra')
const Promise  = require('bluebird')
const sizeOf   = require('image-size')

const logger   = require('./logger.js')

Promise.promisifyAll(fse)

const cacheQueue = []
const imgPromises = {}
const copiedImages = []
let imgCache
let addingImgToCache = false

const ImageSize = function(tplPath) {
    this.tplPath = tplPath
    this.tplName = path.parse(tplPath).base
    this.config = cache.get('config')
}

ImageSize.prototype.setAll = function($, isProd) {

    const promises = []

    $('img').each((i, img) => {

        const $img = $(img)

        // stop here if src does not exist
        const src = $img.attr('src').trim()
        if (!src) return

        // remove inline CSS width/height
        if ($img.css('width')) $img.css({ width: '' })
        if ($img.css('height')) $img.css({ height: '' })

        // stop here if dimensions are already set in HTML
        if ($img.attr('width') && $img.attr('height')) return

        const promise = this.getSize(src)
            .then(({ width, height }) => {
                // set HTML attribute width/height
                $img.attr({ width, height })
            })
            .catch(() => false) // error: image can't be found, ignore

        promises.push(promise)

    })

    return Promise.all(promises).then(() => $)

}

ImageSize.prototype.getSize = function(src) {

    return this.getSizeFromCache(src)
        .then(cachedImgSize => {

            // check the cache first
            if (cachedImgSize) {
                return cachedImgSize
            }

            // if not, check if it's an HTTP URL
            if (url.parse(src).protocol) {
                return this.getSizeFromUrl(src)
            }

            // otherwise check local filesystem
            return this.getSizeFromLocal(src)

        })
        .then(dimensions => {
            const imgPath = path.parse(src)

            // handle retina images
            if (_.endsWith(imgPath.name, '@2x')) {
                retinaWarning(imgPath.base, dimensions, 2)
                return {
                    width: Math.floor(dimensions.width / 2),
                    height: Math.floor(dimensions.height / 2)
                }
            }
            if (_.endsWith(imgPath.name, '@3x')) {
                retinaWarning(imgPath.base, dimensions, 3)
                return {
                    width: Math.floor(dimensions.width / 3),
                    height: Math.floor(dimensions.height / 3)
                }
            }

            return dimensions
        })

}

ImageSize.prototype.getSizeFromCache = function(src) {
    if (imgCache && imgCache[src]) {
        return Promise.resolve(imgCache[src])
    }
    return fse.readJsonAsync(this.config.files.imageCache)
        .then(cache => cache[src])
        .catch(() => false)
}

ImageSize.prototype.getSizeFromUrl = function(src) {
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
                const error = `Could not find image ${src} (status code ${response.statusCode}).`
                logger.warn(error)
                return reject(new Error(error))
            }
            const chunks = []
            response
                .on('data', chunk => chunks.push(chunk))
                .on('end', () => {
                    const dimensions = sizeOf(Buffer.concat(chunks))
                    that.addToImageCache(src, dimensions)
                    resolve(dimensions)
                })
        }).on('error', err => {
            logger.warn(`${err.code}: Could not find image ${src}`)
            reject(err)
        })
    })
    imgPromises[src] = promise
    return promise
}

ImageSize.prototype.getSizeFromLocal = function(src) {
    // make sure the image exists, then get its size
    const filepath = path.resolve(this.tplPath, src)
    return fse.accessAsync(filepath, fse.F_OK).then(() => {
        this.copyLocalImgToBuild(src)
        return sizeOf(filepath)
    })
}

ImageSize.prototype.copyLocalImgToBuild = function(src) {
    const from = path.resolve(this.tplPath, src)
    const to = path.resolve(this.config.dirs.build, this.tplName, src)

    // copy to build if it hasn't already been copied
    if (!copiedImages.includes(to)) {
        logger.warn(`References to local images will not work in production. Please copy ${src} to a server.`)
        copiedImages.push(to)
        return fse.copyAsync(from, to)
    }
    return Promise.resolve()
}

ImageSize.prototype.addToImageCache = function(src, dimensions) {

    // to prevent overwriting, add this request to the queue
    // if we're already processing another image right now
    if (addingImgToCache) {
        cacheQueue.push([src, dimensions])
        return
    }

    addingImgToCache = true

    return this.getCache()
        .then(cache => {
            // stop here if this image is already in the cache
            if (cache[src] === dimensions) {
                return
            }

            // save updated cache to filesystem
            cache[src] = dimensions
            return fse.outputJson(this.config.files.imageCache, cache)
        })
        .then(() => {
            addingImgToCache = false

            // execute recursively if there are more requests in the queue
            if (cacheQueue.length) {
                const [ nextSrc, nextDimensions ] = cacheQueue.shift()
                return this.addToImageCache(nextSrc, nextDimensions)
            }
        })
}

// get the image size cache
ImageSize.prototype.getCache = function() {

    // if we already have the cache in memory, return it
    if (imgCache) {
        return Promise.resolve(imgCache)
    }

    // otherwise, read the cache from the filesystem
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

const retinaWarning = (imgName, dimensions, mod) => {
    if (dimensions.width % mod !== 0) {
        logger.warn(`${imgName} is a retina image, but its width ${dimensions.width}px is not divisible by ${mod}`)
    }
    if (dimensions.height % mod !== 0) {
        logger.warn(`${imgName} is a retina image, but its height ${dimensions.height}px is not divisible by ${mod}`)
    }
}

module.exports = ImageSize
