'use strict';

// includes
var _            = require('lodash');
var q            = require('q');
var cache        = require('memory-cache');

// imports
var utils        = require('./lib/utils.js');
var Build        = require('./lib/build.js');
var config       = utils.requireAndInit('config', __dirname);
var templateInfo = utils.requireAndInit('templateInfo');

// add config to cache
cache.put('config', config);

module.exports = function(filePath) {
    var tplRootPath = (filePath && _.isString(filePath)) ? filePath : (__dirname + '/templates');
    return templateInfo.getTplPaths(tplRootPath)
        .then(buildEmails)
        .catch(function(err) {
            utils.logError(1, err);
        });
};

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
