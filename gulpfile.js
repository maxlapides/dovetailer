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

var configClass = require('./lib/config.js');
var config      = new configClass(__dirname);

var templateInfoClass = require('./lib/templateInfo.js');
var templateInfo      = new templateInfoClass(config);

// globals
var devBuildsOn  = true;
var prodBuildsOn = true;

/*** GULP TASKS ***/

gulp.task('default', ['start']);
gulp.task('dev-only', ['disableProdBuilds', 'start']);
gulp.task('prod-only', ['disableDevBuilds', 'start']);

gulp.task('start', ['compile', 'watch']);

gulp.task('compile', compile);

gulp.task('watch', function() {
	gulp.watch(config.commonDir+'/**/*', compile);
	gulp.watch(config.templatesDir+'/**/*', compile);
});

gulp.task('disableDevBuilds', function() {
	devBuildsOn = false;

});

gulp.task('disableProdBuilds', function() {
	prodBuildsOn = false;
});

/*** BUILD METHODS ***/

function compile(event) {
	templateInfo.getTplNames(event.path)
		.then(generateEmails)
		.then(reload)
		.done();
}

function generateEmails(templates) {

	var defer = q.defer();
	var allPromises = [];

	_.each(templates, function(tplName) {

		var promise = prepareBuild(tplName)
			.then(buildHTMLEmail)
			.then(buildTextEmail)
			.then(cleanSpecialChars)
			.then(injectHeadResetStyles)
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

	var htmlPromise = compileHandlebars(args);
	var stylesPromise = compileMainStyles(args);
	var inlineResetStylesPromise = compileInlineResetStyles(args);

	var allPromises = [htmlPromise, stylesPromise, inlineResetStylesPromise];

	q.all(allPromises).then(function(compiled) {

		var html = compiled[0];
		var styles = compiled[1];
		var inlineResetStyles = compiled[2];

		var tplInlineStyles = styles.styles;
		var responsiveStyles = styles.mediaQueries;

		var allInlineStyles = inlineResetStyles + tplInlineStyles;

		// inline styles
		inlineCSS(html, allInlineStyles)

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

function compileHandlebars(args) {

	var defer = q.defer();

	// get the paths for the Handlebars code and the data
	var hbsPath = path.join(config.templatesDir, args.tplName, 'html.handlebars');
	var dataPath = path.join(config.templatesDir, args.tplName, 'content.json');

	// get the Handlebars code and the data
	var allPromises = [
		getFile(hbsPath),
		getFile(dataPath)
	];

	// compile the HTML template
	q.all(allPromises).then(function(sources) {

		var hbs = sources[0];
		var data = JSON.parse(sources[1]);

		if(!hbs) {
			var error = args.tplName + ' could not find html.handlebars';
			logError(2, error);
			defer.reject(new Error(error));
		}

		var template = handlebars.compile(hbs);
		var html = template(data ? data : null);

		defer.resolve(html);

	});

	return defer.promise;

}

function getFile(path) {

	var defer = q.defer();

	fse.readFile(path, 'utf-8', function(error, source) {
		defer.resolve(error ? false : source);
	});

	return defer.promise;

}

function compileMainStyles(args) {

	var defer = q.defer();

	var sassPath = path.join(config.templatesDir, args.tplName, 'style.scss');

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

function compileInlineResetStyles(args) {

	var defer = q.defer();

	// look for custom reset styles first
	var resetPath = path.join(config.templatesDir, args.tplName, 'reset-inline.scss');

	fse.exists(resetPath, function(exists) {

		// if custom reset styles don't exist, use the common reset styles
		if(!exists) {
			resetPath = path.join(config.commonDir, 'reset-inline.scss');
		}

		// compile the reset styles
		compileSass(resetPath).then(defer.resolve);

	});

	return defer.promise;

}

function injectHeadResetStyles(args) {

	var defer = q.defer();

	// look for custom reset styles first
	var resetPath = path.join(config.templatesDir, args.tplName, 'reset-head.scss');

	fse.exists(resetPath, function(exists) {

		// if custom reset styles don't exist, use the common reset styles
		if(!exists) {
			resetPath = path.join(config.commonDir, 'reset-head.scss');
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
	return path.join(config.buildDir, tplName, tplName+'.'+extension);
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
