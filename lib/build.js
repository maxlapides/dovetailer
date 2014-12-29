'use strict';

var _             = require('lodash');
var cheerio       = require('cheerio');
var entityconvert = require('entity-convert');
var juice         = require('juice');
var q             = require('q');
var cache         = require('memory-cache');
var minify        = require('html-minifier').minify;
var utils         = require('./utils.js');

var Build = function(tplName) {
	this.tplName = tplName;
	this.config = cache.get('config');
};

Build.prototype.go = function() {

	var defer = q.defer();

	this.get()
		.then(this.saveEmails.bind(this))
		.then(defer.resolve);

	return defer.promise;

};

Build.prototype.get = function() {

	var defer = q.defer();

	var handlebars = utils.requireAndInit('handlebars', this.tplName);
	var styles     = utils.requireAndInit('styles', this.tplName);

	var promises = [
		handlebars.get(),
		styles.get()
	];

	var that = this;
	q.all(promises).then(function(compiled) {

		var html = compiled[0].html;
		var text = compiled[0].text;
		var css  = compiled[1];

		that.generateProdHtml(html, css);
		that.generateDevHtml(html, css);
		that.text = text;

		that.cleanSpecialChars();

		var emails = {
			html: that.html,
			htmlDev: that.htmlDev,
			text: that.text
		};

		defer.resolve(emails);

	});

	return defer.promise;

};

Build.prototype.generateProdHtml = function(html, css) {

	html = this.injectHeadStyles(html, css.head);
	html = this.injectInlineStyles(html, css.inline);

	html = minify(html, {
		removeComments: true,
		removeCommentsFromCDATA: true,
		removeCDATASectionsFromCDATA: true,
		collapseWhitespace: true,
		minifyCSS: true
	});

	this.html = html;

	return this.html;

};

Build.prototype.generateDevHtml = function(html, css) {

	var $ = cheerio.load(html);
	var that = this;

	function getStyleFilename(style) {
		return that.config.files[style].replace('.scss', '.css');
	}

	function getStylesheet(styleName) {

		var path;

		// if this is the main stylesheet or
		// if this is a custom reset stylesheet
		if(styleName === 'styles' || css.customResets[styleName]) {
			path = 'css/' + getStyleFilename(styleName);
		}

		// otherwise, this must be a common stylesheet
		else {
			path = '../common/' + getStyleFilename(styleName);
		}

		// build a DOM node for this stylesheet
		var stylesheet = $('<link/>').attr({
			rel: 'stylesheet',
			type: 'text/css',
			'href': path
		});

		return stylesheet;

	}

	var headStylesheet   = getStylesheet('resetHead');
	var inlineStylesheet = getStylesheet('resetInline');
	var stylesStylesheet = getStylesheet('styles');

	$('head')
		.append('\n<!-- BEGIN DEVELOPMENT VERSION STYLESHEET INJECTS -->\n')
		.append(headStylesheet)
		.append(inlineStylesheet)
		.append(stylesStylesheet)
		.append('\n<!-- END DEVELOPMENT VERSION STYLESHEET INJECTS -->\n\n');

	this.htmlDev = $.html();

	return this.htmlDev;

};

Build.prototype.injectHeadStyles = function(html, styles) {

	var $ = cheerio.load(html);

	if(!$('head style').length) {
		$('head').append('<style type="text/css"></style>');
	}

	$('head style').append(styles);

	return $.html();

};

Build.prototype.injectInlineStyles = function(html, styles) {

	// inline styles using Juice
	html = juice.inlineContent(html, styles);

	// clean up extra whitespace
	html = html.trim();

	// add DOCTYPE
	// this is a bug in Juice, hopefully it will be patched soon
	var doctype = this.config.doctype + '\n';

	if(_.indexOf(html.toLowerCase(), '<!doctype') < 0) {
		html = doctype + html;
	}

	return html;

};

Build.prototype.cleanSpecialChars = function() {

	// convert special characters to HTML entities
	this.html = entityconvert.html(this.html);
	this.htmlDev = entityconvert.html(this.htmlDev);

	// replace non-ASCII characters with ASCII equivalents
	this.text = this.text
		.replace(/[\u2018\u2019]/g, '\'')
		.replace(/[\u201C\u201D]/g, '"')
		.replace(/[\u2013\u2014]/g, '-')
		.replace(/[\u2026]/g, '...')
		.replace(/[^\x00-\x7F]/g, ''); // removes any remaining non-ASCII characters

};

Build.prototype.saveEmails = function() {

	var defer = q.defer();

	var promises = [
		utils.saveEmail(this.html, this.tplName, 'html'),
		utils.saveEmail(this.htmlDev, this.tplName, 'dev.html'),
		utils.saveEmail(this.text, this.tplName, 'txt')
	];

	q.all(promises).then(defer.resolve);

	return defer.promise;

};

module.exports = Build;
