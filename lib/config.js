'use strict';

var path = require('path');

var config = function(rootDir) {

    this.doctype = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

    this.dirs = {
        templates : path.join(rootDir, 'templates'),
        build     : path.join(rootDir, 'build'),
        common    : path.resolve('./common')
    };

    this.buildsEnabled = {
        dev  : true,
        prod : true
    };

    this.files        = {
        html        : 'html.handlebars',
        content     : 'content.json',
        styles      : 'style.scss',
        resetInline : 'reset-inline.scss',
        resetHead   : 'reset-head.scss'
    };

};

module.exports = config;
