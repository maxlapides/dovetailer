'use strict';

var _       = require('lodash');
var cache   = require('memory-cache');
var fse     = require('fs-extra');
var path    = require('path');
var Promise = require('bluebird');
var utils   = require('./utils.js');
Promise.promisifyAll(fse);

var templateInfo = function() {

    /*** PUBLIC METHODS ***/

    this.getTplPaths = function(rootPath) {

        // read all of the files in the root path
        return fse.readdirAsync(rootPath)

            // asynchronously get the stats on every file
            .then(function(files) {
                var fileStats = _.reduce(files, function(allStats, file) {
                    var filePath = path.join(rootPath, file);
                    var isDirectory = fse.statAsync(filePath).then(function(stats) {
                        return { path: filePath, stats: stats };
                    });
                    allStats.push(isDirectory);
                    return allStats;
                }, []);
                return Promise.all(fileStats);
            })

            // filter out all non-directories
            .then(function(files) {
                return _.reduce(files, function(dirs, file) {
                    if(file.stats.isDirectory()) {
                        dirs.push(file.path);
                    }
                    return dirs;
                }, []);
            })

            .catch(function(err) {
                utils.logError(13, err);
            });

    };


    /*** PRIVATE METHODS ***/

    // TODO: need to purge cache on re-build
    function purgeCache(filepath) {

        var fileName = _.last(filepath.split('/'));
        var config = cache.get('config');

        switch(fileName) {

            case config.files.resetHead:
                cache.del('resetHead');
                break;

            case config.files.resetInline:
                cache.del('resetInline');
                break;

        }

    }

};

module.exports = templateInfo;
