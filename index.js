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

async function buildEmails(templates) {
  const buildPromises = _.reduce(
    templates,
    (builds, tpl) => {
      const build = new Build(tpl)
      builds.push(build.go())
      return builds
    },
    []
  )

  try {
    await Promise.all(buildPromises)
    const changedFiles = await FileSaver.commit()
    logger.info('Emails compiled and saved.')
    return changedFiles
  } catch (err) {
    logger.error(err)
    return []
  }
}

module.exports = main
