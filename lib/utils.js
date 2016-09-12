/* eslint no-console:0 */

'use strict'

const path  = require('path')
const chalk = require('chalk')
const fse   = require('fs-extra')
const cache = require('memory-cache')
const Promise = require('bluebird')

Promise.promisifyAll(fse)

const Utils = {}

Utils.logSuccess = function(msg) {
    const premsg = chalk.bold.green('Success!')
    console.log(`${premsg} ${msg}`)
}

Utils.logError = function(errCode, msg) {
    const premsg = chalk.bold.red(`Error ${errCode}:`)
    console.log(`${premsg} ${msg}`)
}

Utils.require = function(lib) {
    return require(`./${lib}.js`)
}

Utils.requireAndInit = function(lib, param) {
    const Lib = this.require(lib)
    return new Lib(param)
}

Utils.getFile = function(filepath) {
    return fse.readFileAsync(filepath, 'utf-8').catch(function(error) {
        Utils.logError(11, error)
    })
}
Utils.saveEmail = function(email, tplName, extension) {
    const config = cache.get('config')
    const savePath = path.join(config.dirs.build, tplName, `${tplName}.${extension}`)
    return fse.outputFileAsync(savePath, email).catch(function(error) {
        Utils.logError(12, `Failed to save file: ${tplName}.${extension}\n${error}`)
    })
}

Utils.setPartialsPath = function(partialsPath) {
    this.partialsPath = partialsPath
}

Utils.getPartialsPath = function() {
    return this.partialsPath ? this.partialsPath : false
}

module.exports = Utils
