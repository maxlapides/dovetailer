'use strict'

const path       = require('path')
const cache      = require('memory-cache')
const handlebars = require('handlebars')
const Promise    = require('bluebird')
const fse        = require('fs-extra')
const utils      = require('./utils.js')

const HBSCompiler = function(tplPath) {
    this.tplPath = tplPath
    this.config = cache.get('config')
}

HBSCompiler.prototype.get = function() {

    const partialsPath = utils.getPartialsPath()
    let partialsPromise = Promise.resolve()
    if (partialsPath) {
        partialsPromise = this.registerPartials(partialsPath)
    }

    // get the Handlebars code and the data
    const promises = [
        this.getFile(this.tplPath, 'html.handlebars'),
        this.getFile(this.tplPath, 'text.handlebars'),
        this.getFile(this.tplPath, 'content.json')
    ]

    // compile the HTML template
    const that = this

    return partialsPromise.then(function() {
        return Promise.all(promises)
    }).then(function(sources) {

        const hbsHtml = sources[0]
        const hbsText = sources[1]
        const data = JSON.parse(sources[2])

        if (!hbsHtml || !hbsText) {
            return Promise.reject()
        }

        const templateHtml = handlebars.compile(hbsHtml)
        that.html = templateHtml(data ? data : null)

        const templateText = handlebars.compile(hbsText)
        that.text = templateText(data ? data : null)

        return {
            html : that.html,
            text : that.text
        }

    })
    .catch(function(error) {
        utils.logError(14, error)
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
    }).catch(function(err) {
        utils.logError(15, err)
    })
}

module.exports = HBSCompiler
