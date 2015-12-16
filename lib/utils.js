/* eslint no-console:0 */

'use strict';

var chalk = require('chalk');
var fse   = require('fs-extra');
var path  = require('path');
var cache = require('memory-cache');
var q     = require('q');

var Utils = {};

Utils.logSuccess = function(msg) {
	console.log(chalk.bold.green('Success!') + ' ' + msg);
};

Utils.logError = function(errCode, msg) {
	console.log(chalk.bold.red('Error ' + errCode + ':') + ' ' + msg);
};

Utils.require = function(lib) {
	return require('./' + lib + '.js');
};

Utils.requireAndInit = function(lib, param) {
	var Lib = this.require(lib);
	return new Lib(param);
};

Utils.getFile = function(filepath) {

	var defer = q.defer();

	fse.readFile(filepath, 'utf-8', function(error, source) {

		if(error) {
			Utils.logError(11, error);
		}

		defer.resolve(error ? false : source);

	});

	return defer.promise;

};

Utils.saveEmail = function(email, tplName, extension) {

	var defer = q.defer();
	var config = cache.get('config');

	var savePath = path.join(config.dirs.build, tplName, tplName+'.'+extension);

	fse.outputFile(savePath, email, function(error) {
		if(error) {
			Utils.logError(12, 'Failed to save file: ' + tplName+'.'+extension);
			defer.reject(new Error(error));
		}
		else {
			defer.resolve();
		}
	});

	return defer.promise;

};

module.exports = Utils;
