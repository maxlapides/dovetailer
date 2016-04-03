'use strict';

var path = require('path');

var config = function() {

    this.doctype = '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">';

    this.dirs = {
        templates : path.resolve('./templates'),
        build     : path.resolve('./build'),
        common    : path.resolve(__dirname, '../common')
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
