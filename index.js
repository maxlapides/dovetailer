const Promise = require('bluebird')
const config = require('./lib/config')
const logger = require('./lib/logger')
const utils = require('./lib/utils')
const Build = require('./lib/build')
const FileSaver = require('./lib/file-saver')

const templateInfo = utils.requireAndInit('templateInfo')

async function buildEmails(templates) {
  try {
    const buildPromises = templates.map(template => new Build(template).go())
    await Promise.all(buildPromises)
    logger.info('Emails compiled and saved.')
  } catch (err) {
    logger.error(err)
  }
}

function compileDirectory(templatesPath, options = {}) {
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

function compileEmail(tpl, context) {
  FileSaver.disable()
  return new Build(tpl, context).go()
}
compileDirectory.compileEmail = compileEmail

module.exports = compileDirectory
