/* eslint no-console:0 */

'use strict';

var chalk = require('chalk');
var fse   = require('fs-extra');
var path  = require('path');
var cache = require('memory-cache');
var Promise = require('bluebird');
Promise.promisifyAll(fse);

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
    return fse.readFileAsync(filepath, 'utf-8').catch(function(error) {
        Utils.logError(11, error);
    });
};

Utils.saveEmail = function(email, tplName, extension) {
    var config = cache.get('config');
    var savePath = path.join(config.dirs.build, tplName, tplName + '.' + extension);
    return fse.outputFileAsync(savePath, email).catch(function(error) {
        Utils.logError(12, 'Failed to save file: ' + tplName + '.' + extension + '\n' + error);
    });
};

module.exports = Utils;
