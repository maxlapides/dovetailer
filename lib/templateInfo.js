const path = require('path')
const _ = require('lodash')
const fse = require('fs-extra')
const Promise = require('bluebird')

const logger = require('./logger.js')

Promise.promisifyAll(fse)

const templateInfo = function() {
  /** PUBLIC METHODS **/

  this.getTplPaths = rootPath => {
    // read all of the files in the root path
    const rootPathRead = fse.readdirAsync(rootPath)

    return (
      rootPathRead

        // check whether `rootPath` is itself a template directory
        // or if it contains templates directories
        .then(isTemplateDir)
        .then(isTpl => {
          // if rootPath is itself a directory,
          // we can simply return `rootPath` as the lone directory path
          if (isTpl) {
            return [rootPath]
          }

          // otherwise, we need to get a list of all of the template directories
          return getTplDirs(rootPath, rootPathRead)
        })
        .catch(err => {
          logger.error(err)
        })
    )
  }

  /** PRIVATE METHODS **/

  const templateFileExtensions = ['.handlebars', '.hbs', '.html']

  // detect whether or not the files make up an email template
  // by checking for files with extensions listed in `templateFileExtensions`
  function isTemplateDir(files) {
    return _.some(files, file => {
      const fileExtension = path.parse(file).ext
      return _.includes(templateFileExtensions, fileExtension)
    })
  }

  function getTplDirs(rootPath, rootPathRead) {
    return (
      rootPathRead

        // asynchronously get the stats on every file
        .then(files => {
          const fileStats = _.reduce(
            files,
            (allStats, file) => {
              const filePath = path.join(rootPath, file)
              const isDirectory = fse.statAsync(filePath).then(stats => ({
                path: filePath,
                stats
              }))
              allStats.push(isDirectory)
              return allStats
            },
            []
          )
          return Promise.all(fileStats)
        })

        // filter out all non-directories
        .then(files =>
          _.reduce(
            files,
            (dirs, file) => {
              if (file.stats.isDirectory()) {
                dirs.push(file.path)
              }
              return dirs
            },
            []
          )
        )
    )
  }

  // TODO: need to purge cache when resetHead or resetInline styles are modified
  /*
  function purgeCache(filepath) {
    const fileName = _.last(filepath.split('/'))
    const config = cache.get('config')

    switch (fileName) {
      case config.files.resetHead:
        cache.del('resetHead')
        break

      case config.files.resetInline:
        cache.del('resetInline')
        break
    }
  }
  */
}

module.exports = templateInfo
