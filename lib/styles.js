'use strict';

var _       = require('lodash');
var css     = require('css');
var cssc    = require('css-condense');
var fse     = require('fs-extra');
var path    = require('path');
var q       = require('q');
var sass    = require('node-sass');
var utils   = require('./utils.js');

var styles = function(config) {
	this.config = config;
	this.css = {};
};

/*** MAIN METHODS ***/

styles.prototype.get = function() {

	var defer = q.defer();

	this.compile()
		.then(this.separateStyles.bind(this))
		.then(defer.resolve);

	return defer.promise;

};

styles.prototype.compile = function() {

	var defer = q.defer();

	var promises = [
		this.compileMainStyles(),
		this.compileHeadResetStyles(),
		this.compileInlineResetStyles(),
	];

	var that = this;
	q.all(promises).then(function(compiled) {

		that.css.main = compiled[0];
		that.css.reset = {
			head   : compiled[1],
			inline : compiled[2]
		};

		defer.resolve(that.css);

	});

	return defer.promise;

};

styles.prototype.separateStyles = function() {

	var defer = q.defer();

	this.css.head   = this.css.reset.head + this.css.main.head;
	this.css.inline = this.css.reset.inline + this.css.main.inline;

	defer.resolve(this.css);

	return defer.promise;

};

/*** AUXILIARY METHODS ***/

styles.prototype.compileMainStyles = function() {

	var defer = q.defer();
	var sassPath = path.join(this.config.dirs.templates, this.config.tplName, this.config.files.styles);

	this.compileSass(sassPath)
		.then(this.condense.bind(this))
		.then(this.separateMediaQueries.bind(this))
		.then(defer.resolve);

	return defer.promise;

};

styles.prototype.compileHeadResetStyles = function() {

	var defer = q.defer();

	// look for custom reset styles first
	var resetPath = path.join(this.config.dirs.templates, this.config.tplName, this.config.files.resetHead);

	var that = this;
	fse.exists(resetPath, function(exists) {

		// if custom reset styles don't exist, use the common reset styles
		if(!exists) {
			resetPath = path.join(that.config.dirs.common, that.config.files.resetHead);
		}

		// compile the reset styles
		that.compileSass(resetPath).then(defer.resolve);

	});

	return defer.promise;

};

styles.prototype.compileInlineResetStyles = function() {

	var defer = q.defer();

	// look for custom reset styles first
	var resetPath = path.join(this.config.dirs.templates, this.config.tplName, this.config.files.resetInline);

	var that = this;
	fse.exists(resetPath, function(exists) {

		// if custom reset styles don't exist, use the common reset styles
		if(!exists) {
			resetPath = path.join(that.config.dirs.common, that.config.files.resetInline);
		}

		// compile the reset styles
		that.compileSass(resetPath).then(defer.resolve);

	});

	return defer.promise;

};

styles.prototype.compileSass = function(sassPath, devMode) {

	var defer = q.defer();

	sass.render({
		file: sassPath,
		outputStyle: devMode ? 'expanded' : 'compressed',
		sourceComments: devMode ? 'map' : false,
		success: function(styles) {
			defer.resolve(styles);
		},
		error: function(error) {
			utils.logError(3, error);
			defer.reject(new Error(error));
		}
	});

	return defer.promise;

};

styles.prototype.condense = function(styles) {

	var defer = q.defer();

	var compressedStyles = cssc.compress(styles, {
		consolidateViaSelectors    : false,
		consolidateViaDeclarations : false,
		sort                       : false
	});

	defer.resolve(compressedStyles);

	return defer.promise;

};

styles.prototype.separateMediaQueries = function(unseparatedStyles) {

	var defer = q.defer();

	var ast = css.parse(unseparatedStyles);
	var mqast = css.parse('');

	var mediaQuery;
	var rules = ast.stylesheet.rules;

	for(var i = 0; i < rules.length; i++) {
		if(rules[i].type === 'media') {
			mediaQuery = _.first(rules.splice(i, 1));
			mqast = this.addRuleToAST(mqast, mediaQuery);
		}
	}

	var separatedCSS = {
		head   : css.stringify(mqast, {compress: true, sourcemap: false}),
		inline : css.stringify(ast, {compress: true, sourcemap: false})
	};

	defer.resolve(separatedCSS);

	return defer.promise;

};

styles.prototype.addRuleToAST = function(ast, rule) {
	ast.stylesheet.rules.push(rule);
	return ast;
};

module.exports = styles;
