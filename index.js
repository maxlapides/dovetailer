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

module.exports = function(event) {

    return templateInfo.getTplNames(event.path)
        .then(buildEmails)
        .catch(function(err) {
            utils.logError(1, err);
        });
};

function buildEmails(templates) {

    var promises = [];

    _.each(templates, function(tplName) {
        var build = new Build(tplName);
        promises.push(build.go());
    });

    return q.all(promises)
        .then(function() {
            utils.logSuccess('Emails compiled and saved.');
        })
        .catch(function(err) {
            utils.logError(2, err);
        });

}
