'use strict';

var path = require('path');

var config = function(rootDir) {
	this.templatesDir = path.join(rootDir, 'templates');
	this.buildDir     = path.join(rootDir, 'build');
	this.commonDir    = path.join(rootDir, 'common');
};

module.exports = config;
