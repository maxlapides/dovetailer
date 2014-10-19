'use strict';

var cheerio        = require('cheerio');
var entityconvert  = require('entity-convert');
var fse            = require('fs-extra');
var handlebars     = require('handlebars');
var path           = require('path');
var q              = require('q');
var utils          = require('./utils.js');

var styles;

var build = function(config, tplName) {

	this.config = config;
	this.tplName = tplName;

	styles = utils.requireAndInit('styles', config);

};

build.prototype.compile = function() {

	return this.compileHTML()
		.then(this.buildTextEmail.bind(this))
		.then(this.cleanSpecialChars.bind(this))
		.then(this.injectHeadResetStyles.bind(this))
		.then(this.saveEmails.bind(this));

};

build.prototype.compileHTML = function() {

	var defer = q.defer();

	var htmlPromise = this.compileHandlebars();
	var stylesPromise = this.compileMainStyles();
	var inlineResetStylesPromise = this.compileInlineResetStyles();

	var allPromises = [htmlPromise, stylesPromise, inlineResetStylesPromise];

	var that = this;

	q.all(allPromises).then(function(compiled) {

		var html = compiled[0];
		var mainStyles = compiled[1];
		var inlineResetStyles = compiled[2];

		var tplInlineStyles = mainStyles.styles;
		var responsiveStyles = mainStyles.mediaQueries;

		var allInlineStyles = inlineResetStyles + tplInlineStyles;

		// inline styles
		styles.inline(html, allInlineStyles)

			// inject responsive styles
			.then(function(html) {
				that.html = html;
				return that.injectInternalStyles(responsiveStyles);
			})

			// save HTML
			.then(function(html) {
				that.html = html;
				defer.resolve();
			});

	});

	return defer.promise;

};

build.prototype.compileHandlebars = function() {

	var defer = q.defer();

	// get the paths for the Handlebars code and the data
	var hbsPath = path.join(this.config.dirs.templates, this.tplName, 'html.handlebars');
	var dataPath = path.join(this.config.dirs.templates, this.tplName, 'content.json');

	// get the Handlebars code and the data
	var allPromises = [
		utils.getFile(hbsPath),
		utils.getFile(dataPath)
	];

	// compile the HTML template
	var that = this;
	q.all(allPromises).then(function(sources) {

		var hbs = sources[0];
		var data = JSON.parse(sources[1]);

		if(!hbs) {
			var error = that.tplName + ' could not find html.handlebars';
			utils.logError(2, error);
			defer.reject(new Error(error));
		}

		var template = handlebars.compile(hbs);
		var html = template(data ? data : null);

		defer.resolve(html);

	});

	return defer.promise;

};

build.prototype.compileMainStyles = function() {
	var defer = q.defer();
	var sassPath = path.join(this.config.dirs.templates, this.tplName, this.config.files.styles);
	styles.compileMainStyles(sassPath).then(defer.resolve);
	return defer.promise;
};

build.prototype.compileInlineResetStyles = function() {

	var defer = q.defer();

	// look for custom reset styles first
	var resetPath = path.join(this.config.dirs.templates, this.tplName, this.config.files.resetInline);

	var that = this;
	fse.exists(resetPath, function(exists) {

		// if custom reset styles don't exist, use the common reset styles
		if(!exists) {
			resetPath = path.join(that.config.dirs.common, that.config.files.resetInline);
		}

		// compile the reset styles
		styles.compileSass(resetPath).then(defer.resolve);

	});

	return defer.promise;

};

build.prototype.cleanSpecialChars = function() {

	var defer = q.defer();

	// convert special characters to HTML entities
	this.html = entityconvert.html(this.html);

	// replace non-ASCII characters with ASCII equivalents
	this.text = this.text
		.replace(/[\u2018\u2019]/g, '\'')
		.replace(/[\u201C\u201D]/g, '"')
		.replace(/[\u2013\u2014]/g, '-')
		.replace(/[\u2026]/g, '...')
		.replace(/[^\x00-\x7F]/g, ''); // removes any remaining non-ASCII characters

	defer.resolve();

	return defer.promise;

};

build.prototype.injectHeadResetStyles = function() {

	var defer = q.defer();

	// look for custom reset styles first
	var resetPath = path.join(this.config.dirs.templates, this.tplName, this.config.files.resetHead);

	var that = this;

	fse.exists(resetPath, function(exists) {

		// if custom reset styles don't exist, use the common reset styles
		if(!exists) {
			resetPath = path.join(that.config.dirs.common, that.config.files.resetHead);
		}

		// compile the reset styles
		styles.compileSass(resetPath)

			// inject the reset styles
			.then(function(styles) {
				return that.injectInternalStyles(styles);
			})

			// resolve the promise with the updated HTML
			.then(function(html) {
				that.html = html;
				defer.resolve();
			});

	});

	return defer.promise;

};

build.prototype.injectInternalStyles = function(styles) {

	var defer = q.defer();

	var $ = cheerio.load(this.html);

	if(!$('head style').length) {
		$('head').append('<style type="text/css"></style>');
	}

	$('head style').append(styles);

	defer.resolve($.html());

	return defer.promise;

};

build.prototype.buildTextEmail = function() {

	var defer = q.defer();

	// @todo: compile text version
	this.text = '';

	defer.resolve();

	return defer.promise;

};

build.prototype.saveEmails = function() {

	var defer = q.defer();

	var saveEmailPromises = [
		this.saveEmail(this.html, 'html'),
		this.saveEmail(this.text, 'txt')
	];

	q.all(saveEmailPromises).then(defer.resolve);

	return defer.promise;

};

build.prototype.saveEmail = function(email, extension) {
	var defer = q.defer();
	var savePath = path.join(this.config.dirs.build, this.tplName, this.tplName+'.'+extension);
	fse.outputFile(savePath, email, this.outputFileCb(savePath, defer));
	return defer.promise;
};

build.prototype.outputFileCb = function(filePath, defer) {

	var cb = function(error) {
		if(error) {
			utils.logError(4, 'Failed to save file: ' + filePath);
			defer.reject(new Error(error));
		}
		else {
			defer.resolve();
		}
	};

	return cb;

};

module.exports = build;
