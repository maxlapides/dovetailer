const path = require('path')
const _ = require('lodash')
const fse = require('fs-extra')
const Promise = require('bluebird')
const config = require('./config')

Promise.promisifyAll(fse)

class FileSaver {
  constructor() {
    this.files = {}
  }

  save(path, data) {
    _.set(this.files, path, data)
  }

  saveEmail(name, type, data) {
    const path = [name, `${name}.${type}`]
    this.save(path, data)
  }

  saveCss(directory, filename, data) {
    const path = directory ? [directory, 'css', filename] : ['common', filename]
    this.save(path, data)
  }

  // TODO
  _save(filename, data) {}

  // TODO
  _commit(files, path = []) {
    Object.entries(files).forEach(([filename, value]) => {
      if (_.isString(value)) {
        const savePath = path.join(config.dirs.build, ...path)
        this._save(savePath, value)
      } else {
        this._commit(value)
      }
    })
  }

  commit() {
    this._commit(this.files)
  }
}

module.exports = new FileSaver()
