'use strict';

var cache      = require('memory-cache');
var handlebars = require('handlebars');
var path       = require('path');
var Promise    = require('bluebird');
var utils      = require('./utils.js');

var HBSCompiler = function(tplPath) {
    this.tplPath = tplPath;
    this.config = cache.get('config');
};

HBSCompiler.prototype.get = function() {

    // get the Handlebars code and the data
    var promises = [
        this.getHbsFile('html.handlebars'),
        this.getHbsFile('text.handlebars'),
        this.getHbsFile('content.json')
    ];

    // compile the HTML template
    var that = this;

    return Promise.all(promises)
        .then(function(sources) {

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

HBSCompiler.prototype.getHbsFile = function(filename) {
    var hbsPath = path.join(this.tplPath, filename);
    return utils.getFile(hbsPath);
};

module.exports = HBSCompiler;
