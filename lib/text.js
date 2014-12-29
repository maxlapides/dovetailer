'use strict';

var cache = require('memory-cache');

var text = function() {
	this.config = cache.get('config');
};

module.exports = text;
