/****************************
 HTML Email Builder
 Max Lapides
 September 2014
****************************/

'use strict';

// includes
var _            = require('lodash');
var browserSync  = require('browser-sync');
var gulp         = require('gulp');
var q            = require('q');
var cache        = require('memory-cache');

// imports
var utils        = require('./lib/utils.js');
var Build        = require('./lib/build.js');
var config       = utils.requireAndInit('config', __dirname);
var templateInfo = utils.requireAndInit('templateInfo');

// add config to cache
cache.put('config', config);

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

	var defer = q.defer();

	templateInfo.getTplNames(event.path)
		.then(buildEmails)
		.then(reload)
		.then(defer.resolve)
		.catch(function(err) {
			utils.logError(1, err);
		});

	return defer.promise;

}

function buildEmails(templates) {

	var defer = q.defer();
	var promises = [];

	_.each(templates, function(tplName) {
		var build = new Build(tplName);
		promises.push(build.go());
	});

	q.all(promises)
		.then(function() {
			defer.resolve();
			utils.logSuccess('Emails compiled and saved.');
		})
		.catch(function(err) {
			utils.logError(2, err);
		});;

	return defer.promise;

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

	browserSync(serverConfig, defer.resolve);

	return defer.promise;

}
