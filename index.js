// includes
const _ = require('lodash')
const Promise = require('bluebird')

// imports
const config = require('./lib/config')
const logger = require('./lib/logger')
const utils = require('./lib/utils')
const Build = require('./lib/build')

const templateInfo = utils.requireAndInit('templateInfo')

function main(templatesPath, options = {}) {
  if (options.doctype) config.setDoctype(options.doctype)

  return templateInfo
    .getTplPaths(templatesPath)
    .then(buildEmails)
    .catch(err => {
      logger.error(err)
    })
}

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
      logger.info('Emails compiled and saved.')
    })
    .catch(err => {
      logger.error(err)
    })
}

module.exports = main
