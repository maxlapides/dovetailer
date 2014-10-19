'use strict';

var _       = require('lodash');
var css     = require('css');
var cssc    = require('css-condense');
var juice   = require('juice');
var q       = require('q');
var sass    = require('node-sass');
var utils   = require('./utils.js');

var styles = function(config) {
	this.config = config;
};

styles.prototype.compileMainStyles = function(sassPath) {

	var defer = q.defer();

	this.compileSass(sassPath)
		.then(this.condense.bind(this))
		.then(this.separateMediaQueries.bind(this))
		.then(defer.resolve)
		.fail(console.log);

	return defer.promise;

};

styles.prototype.compileSass = function(sassPath, devMode) {

	var defer = q.defer();

	sass.render({
		file: sassPath,
		outputStyle: devMode ? 'expanded' : 'compressed',
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

styles.prototype.inline = function(html, styles) {

	var defer = q.defer();

	// inline styles using Juice
	html = juice.inlineContent(html, styles);

	// clean up extra whitespace
	html = html.trim();

	// add DOCTYPE
	// this is a bug in Juice, hopefully it will be patched soon
	var doctype = this.config.doctype + '\n';

	if(_.indexOf(html.trim().toLowerCase(), '<!doctype') < 0) {
		html = doctype + html;
	}

	defer.resolve(html);

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

styles.prototype.separateMediaQueries = function(styles) {

	var defer = q.defer();

	var ast = css.parse(styles);
	var mqast = css.parse('');

	var mediaQuery;
	var rules = ast.stylesheet.rules;

	for(var i = 0; i < rules.length; i++) {
		if(rules[i].type === 'media') {
			mediaQuery = _.first(rules.splice(i, 1));
			mqast = this.addRuleToAST(mqast, mediaQuery);
		}
	}

	defer.resolve({
		styles       : css.stringify(ast, {compress: true, sourcemap: false}),
		mediaQueries : css.stringify(mqast, {compress: true, sourcemap: false})
	});

	return defer.promise;

};

styles.prototype.addRuleToAST = function(ast, rule) {
	ast.stylesheet.rules.push(rule);
	return ast;
};

module.exports = styles;
