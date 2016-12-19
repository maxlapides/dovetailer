'use strict'

// includes
const _       = require('lodash')
const cache   = require('memory-cache')
const Promise = require('bluebird')

// imports
const logger  = require('./lib/logger.js')
const utils   = require('./lib/utils.js')
const Build   = require('./lib/build.js')

const templateInfo = utils.requireAndInit('templateInfo')

module.exports = function main(tplPath, partialsPath) {
    utils.setPartialsPath(partialsPath)
    return templateInfo.getTplPaths(tplPath)
        .then(initConfig)
        .then(buildEmails)
        .catch(err => {
            logger.error(err)
        })
}

function initConfig(templates) {
    // initialize the config object and cache it
    const config = utils.requireAndInit('config')
    cache.put('config', config)
    return templates
}

function buildEmails(templates) {

    const buildPromises = _.reduce(templates, function(builds, tpl) {
        const build = new Build(tpl)
        builds.push(build.go())
        return builds
    }, [])

    return Promise.all(buildPromises)
        .then(() => {
            logger.info('Emails compiled and saved.')
        })
        .catch(err => {
            logger.error(err)
        })

}
