'use strict';

// includes
var _            = require('lodash');
var cache        = require('memory-cache');

// imports
var utils        = require('./lib/utils.js');
var Build        = require('./lib/build.js');
var templateInfo = utils.requireAndInit('templateInfo');

module.exports = function main(tplPath, partialsPath) {
    utils.setPartialsPath(partialsPath);
    return templateInfo.getTplPaths(tplPath)
        .then(initConfig)
        .then(buildEmails)
        .catch(function(err) {
            utils.logError(1, err);
        });
};

function initConfig(templates) {

    // initialize the config object and cache it
    var config = utils.requireAndInit('config');
    cache.put('config', config);

    return templates;

}

function buildEmails(templates) {

    var buildPromises = _.reduce(templates, function(builds, tpl) {
        var build = new Build(tpl);
        builds.push(build.go());
        return builds;
    }, []);

    return Promise.all(buildPromises)
        .then(function() {
            utils.logSuccess('Emails compiled and saved.');
        })
        .catch(function(err) {
            utils.logError(2, err);
        });

}
