// includes
const _ = require('lodash')
const Promise = require('bluebird')

// imports
const config = require('./lib/config')
const logger = require('./lib/logger')
const utils = require('./lib/utils')
const Build = require('./lib/build')
const FileSaver = require('./lib/file-saver')

const templateInfo = utils.requireAndInit('templateInfo')

function main(templatesPath, options = {}) {
  if (options.doctype) {
    config.setDoctype(options.doctype)
  }
  if (options.whitelistSelectors) {
    config.setWhitelistSelectors(options.whitelistSelectors)
  }

  return templateInfo
    .getTplPaths(templatesPath)
    .then(buildEmails)
    .catch(err => {
      logger.error(err)
    })
}

// TODO
function compileEmail(tpl) {
  const build = new Build(tpl)
  return build.go()
}
main.compileEmail = compileEmail

function buildEmails(templates) {
  const buildPromises = _.reduce(
    templates,
    (builds, tpl) => {
      const build = new Build(tpl)
      builds.push(build.go())
      return builds
    },
    []
  )

  return Promise.all(buildPromises)
    .then(() => {
      console.log(JSON.stringify(FileSaver.files, 0, 2))
      logger.info('Emails compiled and saved.')
    })
    .catch(err => {
      logger.error(err)
    })
}

module.exports = main
