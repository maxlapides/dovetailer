const path = require('path')
const fse = require('fs-extra')
const Promise = require('bluebird')
const _ = require('lodash')

const config = require('./config')
const logger = require('./logger')

Promise.promisifyAll(fse)

const Utils = {}

Utils.require = function(lib) {
  return require(`./${lib}.js`)
}

Utils.requireAndInit = function(lib, param) {
  const Lib = this.require(lib)
  return new Lib(param)
}

Utils.saveEmail = function(email, tplName, extension) {
  if (_.isNil(email)) {
    logger.error(
      `Did not save ${tplName}.${extension} because email is ${email}`
    )
    return
  }

  const savePath = path.join(
    config.dirs.build,
    tplName,
    `${tplName}.${extension}`
  )
  return fse.outputFileAsync(savePath, email).catch(err => {
    logger.error(`Failed to save file: ${tplName}.${extension}\n${err}`)
  })
}

module.exports = Utils
