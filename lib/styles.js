'use strict';

var _            = require('lodash');
var autoprefixer = require('autoprefixer-core');
var css          = require('css');
var fse          = require('fs-extra');
var path         = require('path');
var postcss      = require('postcss');
var q            = require('q');
var gulp         = require('gulp');
var gPostcss     = require('gulp-postcss');
var mqpacker     = require('css-mqpacker');
var sass         = require('gulp-sass');
var sourcemaps   = require('gulp-sourcemaps');
var cache        = require('memory-cache');
var utils        = require('./utils.js');

var styles = function(tplName) {
	this.tplName = tplName;
	this.config = cache.get('config');
	this.css = {
		customResets: {
			resetHead: false,
			resetInline: false
		}
	};
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
		this.compileResetStyles('resetHead'),
		this.compileResetStyles('resetInline'),
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
	var sassPath = path.join(this.config.dirs.templates, this.tplName, this.config.files.styles);

	this.compileSass(sassPath)
		.then(this.separateMediaQueries.bind(this))
		.then(defer.resolve);

	return defer.promise;

};

styles.prototype.compileResetStyles = function(styleName) {

	var defer = q.defer();

	// look for custom reset styles first
	var resetPath = path.join(this.config.dirs.templates, this.tplName, this.config.files[styleName]);

	var that = this;
	fse.exists(resetPath, function(customExists) {

		var savePath;

		// if the custom reset styles do exist
		if(customExists) {
			savePath = path.join(that.config.dirs.build, that.tplName, 'css');
			that.css.customResets[styleName] = true;
		}

		// if custom reset styles don't exist, use the common reset styles
		else {

			// check to see if a cached version of the styles exists
			var cached = cache.get(styleName);
			if(cached) {
				defer.resolve(cached);
				return defer.promise;
			}

			// otherwise, compile the common reset styles
			savePath = path.join(that.config.dirs.build, 'common');
			resetPath = path.join(that.config.dirs.common, that.config.files[styleName]);

		}

		// compile the reset styles
		that.compileSass(resetPath, savePath).then(function(styles) {

			// add styles to cache if they are common styles
			if(!customExists) {
				cache.put(styleName, styles);
			}

			defer.resolve(styles);

		});

	});

	return defer.promise;

};

styles.prototype.compileSass = function(sassPath, savePath) {

	var defer = q.defer();

	// set the save path if it does not already exist
	savePath = savePath || path.join(this.config.dirs.build, this.tplName, 'css');

	var sassOpts = {
		outputStyle: 'expanded',
		onSuccess: function(styles) {
			defer.resolve(styles.css);
		},
		onError: function(error) {
			utils.logError(3, error);
			defer.reject(new Error(error));
		}
	};

	gulp.src(sassPath)
		.pipe(sourcemaps.init())
			.pipe(sass(sassOpts))
			.pipe(gPostcss([autoprefixer]))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(savePath));

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

	function stringify(ast) {
		return css.stringify(ast, {
			compress: true,
			sourcemap: false
		});
	}

	var head = stringify(mqast);
	var inline = stringify(ast);

	head = postcss()
		.use(addImportantRuleToAll) // add !important to all declarations
		.use(mqpacker)              // combine media queries
		.process(head);

	var separatedCSS = {
		head   : head,
		inline : inline
	};

	defer.resolve(separatedCSS);

	return defer.promise;

};

styles.prototype.addRuleToAST = function(ast, rule) {
	ast.stylesheet.rules.push(rule);
	return ast;
};

var addImportantRuleToAll = postcss(function(css) {
	css.eachDecl(function(decl) {
		decl.important = true;
	});
});

module.exports = styles;
