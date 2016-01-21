'use strict';

// includes
var browserSync  = require('browser-sync').create();
var cache        = require('memory-cache');
var gulp         = require('gulp');
var path         = require('path');
var Promise      = require('bluebird');
Promise.promisifyAll(browserSync);

// imports
var main   = require('./index.js');
var config;

/*** GULP TASKS ***/

gulp.task('default', ['start']);
gulp.task('dev-only', ['disableProdBuilds', 'start']);
gulp.task('prod-only', ['disableDevBuilds', 'start']);

gulp.task('start', ['compile', 'watch']);

gulp.task('compile', compile);

gulp.task('watch', ['compile'], function() {
    config = cache.get('config');
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
    var templatePath;
    if(event && event.path) {
        templatePath = path.parse(event.path).dir;
    }
    else {
        templatePath = path.join(__dirname, 'templates');
    }
    return main(templatePath).then(reload);
}

function reload() {
    if(browserSync.active) {
        browserSync.reload();
        return Promise.resolve();
    }
    else {
        return startServer();
    }
}

function startServer() {
    return browserSync.initAsync({
        server: {
            baseDir   : 'build',
            directory : true
        },
        logPrefix : 'SERVER'
    });
}
