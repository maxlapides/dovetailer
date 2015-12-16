'use strict';

var _            = require('lodash');
var $            = require('gulp-load-plugins')();
var autoprefixer = require('autoprefixer');
var css          = require('css');
var fse          = require('fs-extra');
var path         = require('path');
var postcss      = require('postcss');
var q            = require('q');
var gulp         = require('gulp');
var mqpacker     = require('css-mqpacker');
var through2     = require('through2');
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
        .then(defer.resolve)
        .catch(function(err) {
            utils.logError(6, err);
        });

    return defer.promise;

};

styles.prototype.compile = function() {

    var defer = q.defer();

    var promises = [
        this.compileMainStyles(),
        this.compileResetStyles('resetHead'),
        this.compileResetStyles('resetInline')
    ];

    var that = this;
    q.all(promises)
        .then(function(compiled) {

            that.css.main = compiled[0];
            that.css.reset = {
                head   : compiled[1],
                inline : compiled[2]
            };

            defer.resolve(that.css);

        })
        .catch(function(err) {
            utils.logError(7, err);
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
        .then(defer.resolve)
        .catch(function(err) {
            utils.logError(8, err);
        });

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
        that.compileSass(resetPath, savePath).then(function(compiledStyles) {

            // add styles to cache if they are common styles
            if(!customExists) {
                cache.put(styleName, compiledStyles);
            }

            defer.resolve(compiledStyles);

        });

    });

    return defer.promise;

};

styles.prototype.compileSass = function(sassPath, savePath) {

    var defer = q.defer();

    // set the save path if it does not already exist
    savePath = savePath || path.join(this.config.dirs.build, this.tplName, 'css');

    var sassOpts = {
        outputStyle: 'expanded'
    };

    var autoprefixerOpts = {
        browsers: ['last 2 version']
    };

    gulp.src(sassPath)

        .pipe($.sourcemaps.init())
            .pipe($.sass(sassOpts).on('error', $.sass.logError))
            .pipe($.postcss([autoprefixer(autoprefixerOpts)]))
        .pipe($.sourcemaps.write())

        // save output
        .pipe(gulp.dest(savePath))

        .pipe(through2.obj(function(obj, enc, next) {
            defer.resolve(obj.contents.toString());
        }));

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

    function stringify(astToStringify) {
        return css.stringify(astToStringify, {
            compress: true,
            sourcemap: false
        });
    }

    var head = stringify(mqast);
    var inline = stringify(ast);

    var addImportantRuleToAll = postcss(function(cssToModify) {
        cssToModify.walkDecls(function(decl) {
            decl.important = true;
        });
    });

    head = postcss()
        .use(addImportantRuleToAll) // add !important to all declarations
        .use(mqpacker)                // combine media queries
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

module.exports = styles;
