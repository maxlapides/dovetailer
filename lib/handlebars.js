'use strict'

const path       = require('path')
const _          = require('lodash')
const cache      = require('memory-cache')
const handlebars = require('handlebars')
const Promise    = require('bluebird')
const fse        = require('fs-extra')
const marked     = require('marked')

const utils      = require('./utils.js')
const logger     = require('./logger.js')

// create a renderer for marked
// do not wrap paragraphs in <p>
// do not automatically convert http://... to <a>s
const renderer = new marked.Renderer()
const defaultRenderer = new marked.Renderer()
renderer.paragraph = text => text
renderer.link = (href, title, text) => {
    if (href === text) {
        return href
    }
    return defaultRenderer.link(href, title, text)
}

const HBSCompiler = function(tplPath) {
    this.tplPath = tplPath
    this.config = cache.get('config')
}

HBSCompiler.prototype.get = function() {

    const partialsPath = utils.getPartialsPath()
    const partialsPromise = partialsPath ? this.registerPartials(partialsPath) : Promise.resolve()

    // get the Handlebars code and the data
    const promises = [
        this.getFile(this.tplPath, 'html.handlebars'),
        this.getFile(this.tplPath, 'text.handlebars'),
        this.getFile(this.tplPath, 'content.json'),
        partialsPromise
    ]

    const that = this

    // compile the HTML and text versions
    return Promise.all(promises)
        .then(sources => {

            const hbsHtml = sources[0]
            const hbsText = sources[1]
            const data = JSON.parse(sources[2])

            // parse all of the content strings as markdown
            const markedData = markdownObj(data)

            if (!hbsHtml || !hbsText) {
                return Promise.reject()
            }

            const templateHtml = handlebars.compile(hbsHtml, { noEscape: true })
            that.html = templateHtml(markedData || null)

            const templateText = handlebars.compile(hbsText)
            that.text = templateText(data || null)

            return {
                html : that.html,
                text : that.text
            }

        })
        .catch(err => {
            logger.error(err)
        })

}

HBSCompiler.prototype.getFile = function(pathName, filename) {
    const filePath = path.join(pathName, filename)
    return utils.getFile(filePath)
}

HBSCompiler.prototype.registerPartials = function(partialsPath) {
    const that = this
    const partialsPathRead = fse.readdirAsync(partialsPath)

    return partialsPathRead.then(function(files) {
        const promises = files.map(function(file) {
            return that.getFile(partialsPath, file).then(function(contents) {
                handlebars.registerPartial(file.slice(0, file.indexOf('.')), contents)
            })
        })
        return Promise.all(promises)
    }).catch(err => {
        logger.error(err)
    })
}

function markdownObj(data) {

    // error case: bad data
    if (!data) {
        logger.error('Bad JSON!')
        return {}
    }

    // string
    if (_.isString(data)) {
        return marked(data, { renderer })
    }

    // array
    if (_.isArray(data)) {
        return data.map(markdownObj)
    }

    // object
    return _.reduce(data, (out, val, key) => {
        out[key] = markdownObj(val)
        return out
    }, {})
}

module.exports = HBSCompiler
