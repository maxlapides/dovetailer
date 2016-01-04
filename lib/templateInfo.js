'use strict';

var q     = require('q');
var fse   = require('fs-extra');
var path  = require('path');
var _     = require('lodash');
var cache = require('memory-cache');
var utils = require('./utils.js');

var templateInfo = function() {

    /*** PUBLIC METHODS ***/

    this.getTplNames = function(tplPath) {

        // if this compile was triggered by a watch event
        if(tplPath) {

            var defer = q.defer();

            getTplNameByPath(tplPath).then(function(tplName) {

                // just compile the template that was updated
                if(tplName) {
                    defer.resolve([tplName]);
                }

                // if it could not find the template name,
                // the change was probably in the common folder
                // so let's re-build all the templates
                else {
                    purgeCache(tplPath);
                    getAllTplNames().then(defer.resolve);
                }

            });

            return defer.promise;

        }

        // otherwise, build all the templates
        else {
            return getAllTplNames();
        }

    };


    /*** PRIVATE METHODS ***/

    function getTplNameByPath(tplPath) {

        var defer = q.defer();
        var tplName = false;

        tplPath = tplPath.split('/');

        for(var i = tplPath.length-1; i >= 0; i--) {
            if(tplPath[i] === 'templates') {
                tplName = path[i+1];
            }
        }

        defer.resolve(tplName);
        return defer.promise;

    }

    function getAllTplNames() {

        var defer = q.defer();
        var config = cache.get('config');

        var templates = [];
        var allPromises = [];

        // get a listing of the files in templates directory
        fse.readdir(config.dirs.templates, function(err, files) {

            // iterate over the file names
            for(var i = 0; i < files.length; i++) {
                allPromises.push(isDirectory(files[i]));
            }

            q.all(allPromises)
                .then(function(directories) {

                    _.each(directories, function(directory) {
                        if(directory) {
                            templates.push(directory);
                        }
                    });

                    defer.resolve(templates);

                })
                .catch(function(err2) {
                    utils.logError(10, err2);
                });

        });

        return defer.promise;

    }

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

    function isDirectory(file) {

        var defer = q.defer();
        var config = cache.get('config');

        // get the stats for this file
        fse.stat(path.join(config.dirs.templates, file), function(err, stats) {

            if(!stats || !stats.isDirectory()) {
                defer.resolve(false);
            }
            else {
                defer.resolve(file);
            }

        });

        return defer.promise;

    }

};

module.exports = templateInfo;
