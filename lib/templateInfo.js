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
        var rootPathRead = fse.readdirAsync(rootPath);

        return rootPathRead
            // check whether `rootPath` is itself a template directory
            // or if it contains templates directories
            .then(isTemplateDir)
            .then(function(isTpl) {
                // if rootPath is itself a directory,
                // we can simply return `rootPath` as the lone directory path
                if(isTpl) {
                    return [rootPath];
                }
                // otherwise, we need to get a list of all of the template directories
                else {
                    return getTplDirs(rootPath, rootPathRead);
                }
            })
            .catch(function(err) {
                utils.logError(13, err);
            });

    };


    /*** PRIVATE METHODS ***/

    var templateFileExtensions = ['.handlebars', '.hbs', '.html'];

    // detect whether or not the files make up an email template
    // by checking for files with extensions listed in `templateFileExtensions`
    function isTemplateDir(files) {
        var isTpl = false;
        _.each(files, function(file) {
            var fileExtension = path.parse(file).ext;
            if(_.includes(templateFileExtensions, fileExtension)) {
                isTpl = true;
                return false;
            }
        });
        return isTpl;
    }

    function getTplDirs(rootPath, rootPathRead) {

        return rootPathRead

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
            });

    }

    // TODO: need to purge cache when resetHead or resetInline styles are modified
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
