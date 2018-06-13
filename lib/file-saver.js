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
    this.prevFiles = {}
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

  async commit() {
    const savePromises = this._commit()
    const savedFiles = await Promise.all(savePromises)
    this.prevFiles = _.cloneDeep(this.files)
    return savedFiles
  }

  _commit(files = this.files, pathArr = []) {
    return Object.entries(files).reduce((promises, [key, value]) => {
      if (_.isString(value)) {
        // key is filename, value is file data
        const newPathArr = pathArr.concat(key)
        const prevFile = _.get(this.prevFiles, newPathArr)

        // do not save files that haven't changed
        if (value !== prevFile) {
          const savePath = path.join(config.dirs.build, ...newPathArr)
          return promises.concat(this._saveToFile(savePath, value))
        }
      } else {
        // key is next directory in file path, value is object
        return promises.concat(this._commit(value, pathArr.concat(key)))
      }
      return promises
    }, [])
  }

  async _saveToFile(path, data) {
    if (_.isNil(data)) {
      logger.error(`Did not save ${path} because email is ${data}`)
      return
    }

    try {
      await fse.outputFileAsync(path, data)
      return path
    } catch (err) {
      logger.error(`Failed to save file: ${path}\n${err}`)
    }
  }
}

module.exports = new FileSaver()
