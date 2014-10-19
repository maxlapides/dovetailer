'use strict';

var q    = require('q');
var fse  = require('fs-extra');
var path = require('path');
var _    = require('lodash');

var templateInfo = function(config) {

	/*** PUBLIC METHODS ***/

	this.getTplNames = function(path) {

		var defer = q.defer();

		// if this compile was triggered by a watch event
		if(path) {

			getTplNameByPath(path).then(function(tplName) {

				// just compile the template that was updated
				if(tplName) {
					defer.resolve([tplName]);
				}

				// if it could not find the template name,
				// the change was probably in the common folder
				// so let's re-build all the templates
				else {
					getAllTplNames().then(defer.resolve);
				}

			});

		}

		// otherwise, build all the templates
		else {
			getAllTplNames().then(defer.resolve);
		}

		return defer.promise;

	};


	/*** PRIVATE METHODS ***/

	function getTplNameByPath(path) {

		var defer = q.defer();
		var tplName = false;

		path = path.split('/');

		for(var i = path.length-1; i >= 0; i--) {
			if(path[i] === 'templates') {
				tplName = path[i+1];
			}
		}

		defer.resolve(tplName);
		return defer.promise;

	}

	function getAllTplNames() {

		var defer = q.defer();

		var templates = [];
		var allPromises = [];

		// get a listing of the files in templates directory
		fse.readdir(config.dirs.templates, function(err, files) {

			// iterate over the file names
			for(var i = 0; i < files.length; i++) {
				allPromises.push(isDirectory(files[i]));
			}

			q.all(allPromises).then(function(directories) {

				_.each(directories, function(directory) {
					if(directory) {
						templates.push(directory);
					}
				});

				defer.resolve(templates);

			});

		});

		return defer.promise;

	}

	function isDirectory(file) {

		var defer = q.defer();

		// get the stats for this file
		fse.stat(path.join(config.dirs.templates, file), function(err, stats) {

			if(!stats || !stats.isDirectory()) {
				defer.resolve(false);
			}
			else {
				defer.resolve(file);
			}

		});

		return defer.promise;

	}

};

module.exports = templateInfo;
