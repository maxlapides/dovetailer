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
var sass           = require('node-sass');
var css            = require('css');
var cssc           = require('css-condense');
var chalk          = require('chalk');
var browserSync    = require('browser-sync');
var handlebars     = require('handlebars');
var cheerio        = require('cheerio');
var juice          = require('juice');

// globals
var devBuildsOn  = true;
var prodBuildsOn = true;
var templatesDir = path.join(__dirname, 'templates');
var buildDir     = path.join(__dirname, 'build');
var commonDir    = path.join(__dirname, 'common');
var templates    = [];

/*** GULP TASKS ***/

gulp.task('default', ['start']);
gulp.task('dev-only', ['disableProdBuilds', 'start']);
gulp.task('prod-only', ['disableDevBuilds', 'start']);

gulp.task('start', ['compile', 'watch']);

gulp.task('compile', compile);

gulp.task('watch', function() {
	gulp.watch(commonDir+'/**/*', compile);
	gulp.watch(templatesDir+'/**/*', compile);
});

gulp.task('disableDevBuilds', function() {
	devBuildsOn = false;

});

gulp.task('disableProdBuilds', function() {
	prodBuildsOn = false;
});

/*** BUILD METHODS ***/

function compile(event) {
	getTplNames(event.path)
		.then(generateEmails)
		.then(reload)
		.done();
}

function getTplNames(path) {

	var defer = q.defer();

	templates = [];

	// if this compile was triggered by a watch event
	if(path) {

		getTplNameByPath(path).then(function(tplName) {

			// just compile the template that was updated
			if(tplName) {
				templates.push(tplName);
				defer.resolve(templates);
			}

			// if it could not find the template name,
			// the change was probably in the common folder
			// so let's re-build all the templates
			else {
				getAllTplNames().then(defer.resolve);
			}

		});

	}

	// otherwise, build all the templates
	else {
		getAllTplNames().then(defer.resolve);
	}

	return defer.promise;

}

function getTplNameByPath(path) {

	var defer = q.defer();
	var tplName = false;

	path = path.split('/');

	for(var i = path.length-1; i >= 0; i--) {
		if(path[i] === 'templates') {
			tplName = path[i+1];
		}
	}

	defer.resolve(tplName);
	return defer.promise;

}

function getAllTplNames() {

	var defer = q.defer();
	var allPromises = [];

	// get a listing of the files in templatesDir
	fse.readdir(templatesDir, function(err, files) {

		// iterate over the file names
		for(var i = 0; i < files.length; i++) {
			allPromises.push(isDirectory(files[i]));
		}

		q.all(allPromises).then(function(directories) {

			_.each(directories, function(directory) {
				if(directory) {
					templates.push(directory);
				}
			});

			defer.resolve(templates);

		});

	});

	return defer.promise;

}

function isDirectory(file) {

	var defer = q.defer();

	// get the stats for this file
	fse.stat(path.join(templatesDir, file), function(err, stats) {

		if(!stats || !stats.isDirectory()) {
			defer.resolve(false);
		}

		else {
			defer.resolve(file);
		}

	});

	return defer.promise;

}

function generateEmails() {

	var defer = q.defer();
	var allPromises = [];

	_.each(templates, function(tplName) {

		var promise = prepareBuild(tplName)
			.then(buildHTMLEmail)
			.then(buildTextEmail)
			.then(cleanSpecialChars)
			.then(injectResetStyles)
			.then(saveEmails);

		allPromises.push(promise);

	});

	q.all(allPromises).then(function() {
		defer.resolve();
		logSuccess('Emails compiled and saved.');
	});

	return defer.promise;

}

function prepareBuild(tplName) {

	var defer = q.defer();

	defer.resolve({
		tplName : tplName
	});

	return defer.promise;

}

function buildHTMLEmail(args) {

	var defer = q.defer();

	var htmlPromise = compileHandlebars(args.tplName);
	var stylesPromise = compileMainStyles(args.tplName);

	q.all([htmlPromise, stylesPromise]).then(function(compiled) {

		var html = compiled[0];
		var styles = compiled[1];

		var inlineStyles = styles.styles;
		var responsiveStyles = styles.mediaQueries;

		// inline styles
		inlineCSS(html, inlineStyles)

			// inject responsive styles
			.then(function(html) {
				return injectInternalStyles(html, responsiveStyles);
			})

			// save HTML
			.then(function(html) {
				args.html = html;
				defer.resolve(args);
			});

	});

	return defer.promise;

}

function inlineCSS(html, styles) {

	var defer = q.defer();

	// inline styles using Juice
	html = juice.inlineContent(html, styles);

	// add DOCTYPE
	// this is a bug in Juice, hopefully it will be patched soon
	var doctype = '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">\n';
	html = html.trim();
	if(_.indexOf(html.toLowerCase(), '<!doctype') < 0) {
		html = doctype + html;
	}

	defer.resolve(html);
	return defer.promise;
}

function buildTextEmail(args) {

	var defer = q.defer();

	// @todo: compile text version
	args.text = '';

	defer.resolve(args);

	return defer.promise;

}

function compileHandlebars(tplName) {

	var defer = q.defer();

	// get the paths for the Handlebars code and the data
	var hbsPath = path.join(templatesDir, tplName, 'html.handlebars');
	var dataPath = path.join(templatesDir, tplName, 'content.json');

	// get the Handlebars code and the data
	var allPromises = [
		getFile(hbsPath),
		getFile(dataPath)
	];

	// compile the HTML template
	q.all(allPromises).then(function(sources) {

		var hbs = sources[0];
		var data = JSON.parse(sources[1]);

		var template = handlebars.compile(hbs);
		var html = template(data);

		defer.resolve(html);

	});

	return defer.promise;

}

function getFile(path) {

	var defer = q.defer();

	fse.readFile(path, 'utf-8', function(error, source) {

		if(error) {
			logError(2, error);
			defer.reject(new Error(error));
		}

		else {
			defer.resolve(source);
		}

	});

	return defer.promise;

}

function compileMainStyles(tplName) {

	var defer = q.defer();

	var sassPath = path.join(templatesDir, tplName, 'style.scss');

	compileSass(sassPath)
		.then(condenseCSS)
		.then(separateMediaQueries)
		.then(defer.resolve);

	return defer.promise;

}

function condenseCSS(styles) {

	var defer = q.defer();

	var compressedCSS = cssc.compress(styles, {
		consolidateViaSelectors    : false,
		consolidateViaDeclarations : false,
		sort                       : false
	});

	defer.resolve(compressedCSS);

	return defer.promise;

}

function separateMediaQueries(styles) {

	var defer = q.defer();

	var ast = css.parse(styles);
	var mqast = css.parse('');

	var mediaQuery;
	var rules = ast.stylesheet.rules;

	for(var i = 0; i < rules.length; i++) {
		if(rules[i].type === 'media') {
			mediaQuery = _.first(rules.splice(i, 1));
			mqast = addStyleRuleToAST(mqast, mediaQuery);
		}
	}

	defer.resolve({
		styles       : css.stringify(ast, {compress: true, sourcemap: false}),
		mediaQueries : css.stringify(mqast, {compress: true, sourcemap: false})
	});

	return defer.promise;

}

function addStyleRuleToAST(ast, rule) {
	ast.stylesheet.rules.push(rule);
	return ast;
}

function cleanSpecialChars(args) {

	var defer = q.defer();

	// convert special characters to HTML entities
	args.html = entityconvert.html(args.html);

	// replace non-ASCII characters with ASCII equivalents
	args.text = args.text
		.replace(/[\u2018\u2019]/g, '\'')
		.replace(/[\u201C\u201D]/g, '"')
		.replace(/[\u2013\u2014]/g, '-')
		.replace(/[\u2026]/g, '...')
		.replace(/[^\x00-\x7F]/g, ''); // removes any remaining non-ASCII characters

	defer.resolve(args);

	return defer.promise;

}

function injectResetStyles(args) {

	var defer = q.defer();

	// look for custom reset styles first
	var resetPath = path.join(templatesDir, args.tplName, 'reset.scss');

	fse.exists(resetPath, function(exists) {

		// if custom reset styles don't exist, use the common reset styles
		if(!exists) {
			resetPath = path.join(commonDir, 'reset.scss');
		}

		// compile the reset styles
		compileSass(resetPath)

			// inject the reset styles
			.then(function(styles) {
				return injectInternalStyles(args.html, styles);
			})

			// resolve the promise with the updated HTML
			.then(function(html) {
				args.html = html;
				defer.resolve(args);
			});

	});

	return defer.promise;

}

function injectInternalStyles(html, styles) {

	var defer = q.defer();

	var $ = cheerio.load(html);

	if(!$('head style').length) {
		$('head').append('<style type="text/css"></style>');
	}

	$('head style').append(styles);

	defer.resolve($.html());

	return defer.promise;

}

function compileSass(sassPath) {

	var defer = q.defer();

	sass.render({
		file: sassPath,
		//outputStyle: devMode ? 'expanded' : 'compressed',
		success: function(styles) {
			defer.resolve(styles);
		},
		error: function(error) {
			logError(3, error);
			defer.reject(new Error(error));
		}
	});

	return defer.promise;

}

function saveEmails(emails) {
	saveEmail(emails.html, emails.tplName, 'html');
	saveEmail(emails.text, emails.tplName, 'txt');
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
			logError(4, 'Failed to save file: ' + filePath);
			defer.reject(new Error(error));
		}
		else {
			defer.resolve();
		}
	};

	return cb;

}

function reload() {

	var defer = q.defer();

	if(browserSync.active) {
		browserSync.reload();
	}

	else {
		startServer();
	}

	return defer.promise;

}

function startServer() {
	browserSync({
		server: {
			baseDir: 'build',
			directory: true
		}
	});
}

function logSuccess(msg) {
	console.log(chalk.bold.green('Success!') + ' ' + msg);
}

function logError(errCode, msg) {
	console.log(chalk.bold.red('Error ' + errCode + ':') + ' ' + msg);
}
