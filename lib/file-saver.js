const path = require('path')
const _ = require('lodash')
const fse = require('fs-extra')
const Promise = require('bluebird')
const config = require('./config')
const logger = require('./logger')

Promise.promisifyAll(fse)

class FileSaver {
  constructor() {
    this.files = {}
    this.enabled = true
  }

  enable() {
    this.enabled = true
  }

  disable() {
    this.enabled = false
  }

  save(path, data) {
    const prevData = _.get(this.files, path)
    if (prevData !== data) {
      _.set(this.files, path, data)
      return this._saveToFile(path, data)
    }
    return Promise.resolve()
  }

  saveEmail(name, type, data) {
    const path = [name, `${name}.${type}`]
    this.save(path, data)
  }

  saveCss(directory, filename, data) {
    const path = directory
      ? [directory, 'css', filename]
      : ['.common', filename]
    this.save(path, data)
  }

  async _saveToFile(pathArr, data) {
    if (!this.enabled) return

    const filePath = path.join(config.dirs.build, ...pathArr)

    if (_.isNil(data)) {
      logger.error(`Did not save ${filePath} because email is ${data}`)
      return
    }

    try {
      await fse.outputFileAsync(filePath, data)
      return filePath
    } catch (err) {
      logger.error(`Failed to save file: ${filePath}\n${err}`)
    }
  }
}

module.exports = new FileSaver()
