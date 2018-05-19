const path = require('path')

class Config {
  constructor() {
    this.doctype =
      '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">'

    this.dirs = {
      build: path.resolve('./build'),
      common: path.resolve(__dirname, '../common')
    }

    this.buildsEnabled = {
      dev: true,
      prod: true
    }

    this.files = {
      styles: 'style.scss',
      resetInline: 'reset-inline.scss',
      resetHead: 'reset-head.scss',
      imageCache: path.resolve('./cache/images.json')
    }

    this.whitelistSelectors = [
      '#outlook',
      '.ExternalClass',
      '.ReadMsgBody',
      '#preview_text'
    ]
  }

  setDoctype(doctype) {
    this.doctype = doctype
  }

  setWhitelistSelectors(whitelistSelectors = []) {
    this.whitelistSelectors = this.whitelistSelectors.concat(whitelistSelectors)
  }
}

module.exports = new Config()
