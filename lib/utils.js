const path = require('path')
const fse = require('fs-extra')
const cache = require('memory-cache')
const Promise = require('bluebird')

const logger = require('./logger.js')

Promise.promisifyAll(fse)

const Utils = {}

Utils.require = function(lib) {
  return require(`./${lib}.js`)
}

Utils.requireAndInit = function(lib, param) {
  const Lib = this.require(lib)
  return new Lib(param)
}

Utils.getFile = function(filepath) {
  return fse.readFileAsync(filepath, 'utf-8').catch(err => {
    logger.error(err)
  })
}
Utils.saveEmail = function(email, tplName, extension) {
  const config = cache.get('config')
  const savePath = path.join(
    config.dirs.build,
    tplName,
    `${tplName}.${extension}`
  )
  return fse.outputFileAsync(savePath, email).catch(err => {
    logger.error(`Failed to save file: ${tplName}.${extension}\n${err}`)
  })
}

Utils.setPartialsPath = function(partialsPath) {
  this.partialsPath = partialsPath
}

Utils.getPartialsPath = function() {
  return this.partialsPath || false
}

Utils.setOptions = function(options) {
  this.options = options
}

Utils.getOptions = function() {
  return this.options || {}
}

module.exports = Utils
