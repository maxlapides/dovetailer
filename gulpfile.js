'use strict';

// includes
var _            = require('lodash');
var browserSync  = require('browser-sync').create();
var gulp         = require('gulp');
var q            = require('q');
var cache        = require('memory-cache');

// imports
var main   = require('./index.js');
var config = cache.get('config');

/*** GULP TASKS ***/

gulp.task('default', ['start']);
gulp.task('dev-only', ['disableProdBuilds', 'start']);
gulp.task('prod-only', ['disableDevBuilds', 'start']);

gulp.task('start', ['compile', 'watch']);

gulp.task('compile', compile);

gulp.task('watch', function() {
    gulp.watch(config.dirs.common+'/**/*', compile);
    gulp.watch(config.dirs.templates+'/**/*', compile);
});

gulp.task('disableDevBuilds', function() {
    cache.put('devBuildDisabled', true);
});

gulp.task('disableProdBuilds', function() {
    cache.put('prodBuildDisabled', true);
});

/*** BUILD METHODS ***/

function compile(event) {
    return main(event).then(reload);
}

function reload() {

    var defer = q.defer();

    if(browserSync.active) {
        browserSync.reload();
        defer.resolve();
    }
    else {
        startServer().then(defer.resolve);
    }

    return defer.promise;

}

function startServer() {

    var defer = q.defer();

    var serverConfig = {
        server: {
            baseDir   : 'build',
            directory : true
        },
        logPrefix : 'SERVER'
    };

    browserSync.init(serverConfig, defer.resolve);

    return defer.promise;

}
