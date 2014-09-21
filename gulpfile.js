/****************************
 HTML Email Builder
 Max Lapides
 September 2014
****************************/

'use strict';

// includes
var gulp           = require('gulp');
var fse            = require('fs-extra');
var path           = require('path');
var _              = require('lodash');
var q              = require('q');
var entityconvert  = require('entity-convert');
var emailTemplates = require('email-templates');
var sass           = require('node-sass');
var chalk          = require('chalk');

// globals
var devBuildsOn  = true;
var prodBuildsOn = true;
var templatesDir = path.join(__dirname, 'templates');
var buildDir     = path.join(__dirname, 'build');
var commonDir    = path.join(__dirname, 'common');
var templates    = [];
var assemble     = false;

/*** GULP TASKS ***/

gulp.task('default', ['compile', 'watch']);
gulp.task('dev-only', ['disableProdBuilds', 'compile', 'watch']);
gulp.task('prod-only', ['disableDevBuilds', 'compile', 'watch']);

gulp.task('compile', function() {
	preclean()
		.then(makeAssemble)
		.then(getTemplateNames)
		.then(generateEmails);
});

gulp.task('watch', function() {
	gulp.watch(commonDir+'/**/*', ['compile']);
	gulp.watch(templatesDir+'/**/*', ['compile']);
});

gulp.task('disableDevBuilds', function() {
	devBuildsOn = false;

});

gulp.task('disableProdBuilds', function() {
	prodBuildsOn = false;
});

/*** BUILD METHODS ***/

function preclean() {

	var defer = q.defer();

	// reset variables
	templates = [];
	assemble  = false;

	defer.resolve();

	return defer.promise;

}

function getTemplateNames() {

	var defer = q.defer();
	var file, j = 0;

	// get a listing of the files in templatesDir
	fse.readdir(templatesDir, function(err, files) {

		// iterate over the file names
		for(var i = 0; i < files.length; i++) {

			// get the next file
			file = files[i];

			// get the stats for this file
			fse.stat(path.join(templatesDir, file), function(err, stats) {

				// if it's a directory, add it to the templates array
				if(stats.isDirectory()) { templates.push(file); }

				// if this is the last file, we're done
				if(++j === files.length) {
					defer.resolve(templates);
				}

			});

		}

	});

	return defer.promise;

}

function makeAssemble() {

	var defer = q.defer();

	if(assemble) {
		defer.resolve(assemble);
	}

	else {

		emailTemplates(templatesDir, function(error, template) {

			if(error) {
				logError(error);
				defer.reject(new Error(error));
				return;
			}

			assemble = template;
			defer.resolve(assemble);

		});

	}

	return defer.promise;

}

function generateEmails() {

	var defer = q.defer();

	makeAssemble().then(function() {

		_.each(templates, function(tplName) {

			var locals = {};

			buildEmail(tplName, locals)
				.then(cleanSpecialChars)
				.then(injectResetStyles)
				.then(injectResponsiveStyles)
				.then(saveEmails);

		}).then(defer.resolve);

	});

	return defer.promise;

}

function buildEmail(tplName, locals) {

	var defer = q.defer();

	assemble(tplName, locals, function(error, html, text) {

		if(error) {
			logError(error);
			defer.reject(new Error(error));
			return;
		}

		var emails = {
			html: html,
			text: text,
			tplName: tplName
		};

		defer.resolve(emails);

	});

	return defer.promise;

}

function cleanSpecialChars(emails) {

	var defer = q.defer();

	// convert special characters to HTML entities
	emails.html = entityconvert.html(emails.html);

	// replace non-ASCII characters with ASCII equivalents
	emails.text = emails.text
		.replace(/[\u2018\u2019]/g, '\'')
		.replace(/[\u201C\u201D]/g, '"')
		.replace(/[\u2013\u2014]/g, '-')
		.replace(/[\u2026]/g, '...')
		.replace(/[^\x00-\x7F]/g, ''); // removes any remaining non-ASCII characters

	defer.resolve(emails);

	return defer.promise;

}

function injectResetStyles(emails) {

	var defer = q.defer();

	// look for custom reset styles first
	var resetPath = path.join(templatesDir, emails.tplName, 'reset.scss');

	fse.exists(resetPath, function(exists) {

		// if custom reset styles don't exist, use the common reset styles
		if(!exists) {
			resetPath = path.join(commonDir, 'reset.scss');
		}

		// inject the reset styles
		injectInternalStyles(emails.html, resetPath).then(function(newHtml) {
			emails.html = newHtml;
			defer.resolve(emails);
		});

	});

	return defer.promise;

}

function injectResponsiveStyles(emails) {

	var defer = q.defer();

	var responsivePath = path.join(templatesDir, emails.tplName, 'responsive.scss');

	fse.exists(responsivePath, function(exists) {
		if(exists) {
			injectInternalStyles(emails.html, responsivePath).then(function(newHtml) {
				emails.html = newHtml;
				defer.resolve(emails);
			});
		}
		else {
			defer.resolve(emails);
		}
	});

	return defer.promise;

}

function injectInternalStyles(html, sassPath) {

	var defer = q.defer();

	sass.render({
		file: sassPath,
		//outputStyle: devMode ? 'expanded' : 'compressed',
		success: function(css) {
			var styles = '<style type="text/css">' + css + '</style>\n';
			var head = '</head>';
			html = html.replace(head, styles + head);
			defer.resolve(html);
		},
		error: function(error) {
			logError(error);
		}
	});

	return defer.promise;

}

function saveEmails(emails) {

	q.all([
		saveEmail(emails.html, emails.tplName, 'html'),
		saveEmail(emails.text, emails.tplName, 'txt')
	]).then(function() {
		logSuccess('Emails compiled and saved.');
	});

}

function saveEmail(email, tplName, extension) {
	var defer = q.defer();
	var path = getBuildPath(tplName, extension);
	fse.outputFile(path, email, outputFileCb(path, defer));
	return defer.promise;
}

function getBuildPath(tplName, extension) {
	return path.join(buildDir, tplName, tplName+'.'+extension);
}

function outputFileCb(filePath, defer) {

	var cb = function(error) {
		if(error) {
			logError('Failed to save file: ' + filePath);
			defer.reject(new Error(error));
		}
		else {
			defer.resolve();
		}
	};

	return cb;

}

function logSuccess(msg) {
	console.log(chalk.bold.green('Success!') + ' ' + msg);
}

function logError(msg) {
	console.log(chalk.bold.red('Error!') + ' ' + msg);
}
