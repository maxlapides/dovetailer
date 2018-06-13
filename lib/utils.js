const fse = require('fs-extra')
const Promise = require('bluebird')

Promise.promisifyAll(fse)

const Utils = {}

Utils.require = function(lib) {
  return require(`./${lib}.js`)
}

Utils.requireAndInit = function(lib, param) {
  const Lib = this.require(lib)
  return new Lib(param)
}

module.exports = Utils
