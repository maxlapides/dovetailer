'use strict';

var cache      = require('memory-cache');
var handlebars = require('handlebars');
var path       = require('path');
var Promise    = require('bluebird');
var fse        = require('fs-extra');
var utils      = require('./utils.js');

var HBSCompiler = function(tplPath) {
    this.tplPath = tplPath;
    this.config = cache.get('config');
};

HBSCompiler.prototype.get = function() {

    var partialsPath = utils.getPartialsPath();
    var partialsPromise = Promise.resolve();
    if (partialsPath) {
        partialsPromise = this.registerPartials(partialsPath);
    }
    // get the Handlebars code and the data
    var promises = [
        this.getFile(this.tplPath, 'html.handlebars'),
        this.getFile(this.tplPath, 'text.handlebars'),
        this.getFile(this.tplPath, 'content.json')
    ];
    // compile the HTML template
    var that = this;

    return partialsPromise.then(function () {
        return Promise.all(promises);
    }).then(function(sources) {

        var hbsHtml = sources[0];
        var hbsText = sources[1];
        var data = JSON.parse(sources[2]);

        if(!hbsHtml || !hbsText) {
            return Promise.reject();
        }

        var templateHtml = handlebars.compile(hbsHtml);
        that.html = templateHtml(data ? data : null);

        var templateText = handlebars.compile(hbsText);
        that.text = templateText(data ? data : null);

        return {
            html : that.html,
            text : that.text
        };

    })
    .catch(function(error) {
        utils.logError(14, error);
    });

};

HBSCompiler.prototype.getFile = function(pathName, filename) {
    var filePath = path.join(pathName, filename);
    return utils.getFile(filePath);
};

HBSCompiler.prototype.registerPartials = function(partialsPath) {
    var that = this;
    var partialsPathRead = fse.readdirAsync(partialsPath);

    return partialsPathRead.then(function (files) {
        var promises = files.map(function (file) {
            return that.getFile(partialsPath, file).then(function (contents) {
                handlebars.registerPartial(file.slice(0, file.indexOf('.')), contents);
            });
        });
        return Promise.all(promises);
    }).catch(function(err) {
        utils.logError(15, err);
    });
};

module.exports = HBSCompiler;
