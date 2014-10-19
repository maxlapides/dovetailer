'use strict';

var chalk = require('chalk');
var fse   = require('fs-extra');
var q     = require('q');

var utils = {};

utils.logSuccess = function(msg) {
	console.log(chalk.bold.green('Success!') + ' ' + msg);
};

utils.logError = function(errCode, msg) {
	console.log(chalk.bold.red('Error ' + errCode + ':') + ' ' + msg);
};

utils.require = function(lib) {
	return require('./' + lib + '.js');
};

utils.requireAndInit = function(lib, param) {
	var Lib = this.require(lib);
	return new Lib(param);
};

utils.getFile = function(path) {

	var defer = q.defer();

	fse.readFile(path, 'utf-8', function(error, source) {
		defer.resolve(error ? false : source);
	});

	return defer.promise;

};

module.exports = utils;
