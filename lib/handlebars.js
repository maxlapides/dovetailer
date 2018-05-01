'use strict'

const path       = require('path')
const _          = require('lodash')
const cache      = require('memory-cache')
const handlebars = require('handlebars')
const he         = require('he')
const Promise    = require('bluebird')
const fse        = require('fs-extra')
const marked     = require('marked')

// const detergent  = require('detergent')

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

    // compile the HTML and text versions
    return Promise.all(promises)
        .then(([hbsHtml = '', hbsText = '', rawData = '{}']) => {

            const data = JSON.parse(rawData)

            // parse all of the content strings as markdown
            const markedData = markdownObj(data)

            const templateHtml = handlebars.compile(hbsHtml, { noEscape: true })
            this.html = templateHtml(markedData || null)

            const templateText = handlebars.compile(hbsText)
            this.text = templateText(data || null)

            return {
                html : this.html,
                text : this.text
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
    return new Promise((resolve, reject) => {
        const promises = []
        fse.walk(partialsPath)
            .on('data', item => {
                // skip directories and non-handlebars files
                const isDirectory = item.stats.isDirectory()
                const isHandlebars = ['.hbs', '.handlebars'].includes(path.parse(item.path).ext)
                if (isDirectory || !isHandlebars)
                    return

                // partial should be named dirs/nested/partial
                let name = path.relative(partialsPath, item.path)
                name = name.replace(path.parse(name).ext, '')

                // register partial with file contents
                const promise = utils.getFile(item.path).then(contents => {
                    handlebars.registerPartial(name, contents)
                })
                promises.push(promise)
            })
            .on('end', () => {
                Promise.all(promises).then(resolve).catch(reject)
            })
    })
}

function markdownObj(data) {

    // string
    if (_.isString(data)) {
        // special case: do not parse mailto links as markdown
        if (data.startsWith('mailto:')) return data

        // clean with detergent then parse as markdown
        // return marked(detergent(data), { renderer })

        // TEMPORARY: replace with above once this issue is resolved:
        // https://github.com/code-and-send/detergent/issues/11
        return marked(he.encode(data), { renderer }).replace(/(\s*)\n(\s*)/, '<br />')
    }

    // error case: bad data
    if (!data) {
        logger.error(`Bad JSON! ${data} is not parsable as Markdown.`)
        return {}
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
