'use strict';

var chalk = require('chalk');
var fse   = require('fs-extra');
var path  = require('path');
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

Utils.getFile = function(path) {

	var defer = q.defer();

	fse.readFile(path, 'utf-8', function(error, source) {

		if(error) {
			Utils.logError(5, error);
		}

		defer.resolve(error ? false : source);

	});

	return defer.promise;

};

Utils.saveEmail = function(email, config, extension) {

	var defer = q.defer();

	var savePath = path.join(config.dirs.build, config.tplName, config.tplName+'.'+extension);

	fse.outputFile(savePath, email, function(error) {
		if(error) {
			Utils.logError(4, 'Failed to save file: ' + config.tplName+'.'+extension);
			defer.reject(new Error(error));
		}
		else {
			defer.resolve();
		}
	});

	return defer.promise;

};

module.exports = Utils;
