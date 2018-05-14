const path = require('path')
const _ = require('lodash')
const nunjucks = require('nunjucks')
const Promise = require('bluebird')
const { detergent } = require('detergent')
const fse = require('fs-extra')

const logger = require('./logger.js')

class NunjucksCompiler {
  constructor(tplPath) {
    this.tplPath = tplPath
  }

  async get() {
    nunjucks.configure(this.tplPath, { autoescape: false })
    try {
      const context = await this.requireContext()
      const [html, text] = await Promise.all(
        ['html.njk', 'text.njk'].map(file => this.render(file, context))
      )
      return { html, text }
    } catch (err) {
      logger.error(err)
    }
  }

  async requireContext() {
    try {
      const contextStr = fse.readFileSync(
        path.join(this.tplPath, 'context.json'),
        'utf-8'
      )
      const context = contextStr ? JSON.parse(contextStr) : {}
      return this.cleanContext(context)
    } catch (e) {
      // ignore missing context file
      return {}
    }
  }

  render(tplPath, context) {
    return new Promise((resolve, reject) => {
      nunjucks.render(tplPath, context, (err, res) => {
        if (err) reject(err)
        else resolve(res)
      })
    })
  }

  cleanContext(data) {
    // no need to clean if data is a number, null, or undefined
    if (_.isFinite(data) || _.isNil(data)) {
      return data
    }

    // string
    if (_.isString(data)) {
      // clean with detergent
      return detergent(data, { addMissingSpaces: false }).res
    }

    // array
    if (_.isArray(data)) {
      return data.map(this.cleanContext)
    }

    // object
    return Object.entries(data).reduce((out, [key, val]) => {
      out[key] = this.cleanContext(val)
      return out
    }, {})
  }
}

module.exports = NunjucksCompiler
