const path = require('path')
const _ = require('lodash')
const nunjucks = require('nunjucks')
const Promise = require('bluebird')
const { detergent } = require('detergent')
const fse = require('fs-extra')

const utils = require('./utils')
const logger = require('./logger')

class NunjucksCompiler {
  constructor(tplPath) {
    this.tplPath = tplPath
  }

  async get() {
    this.configureNunjucks()
    try {
      const context = await this.requireContext()
      const [html, text] = await Promise.all(
        [
          path.join(this.tplPath, 'html.njk'),
          path.join(this.tplPath, 'text.njk')
        ].map(file => this.render(file, context))
      )
      return { html, text }
    } catch (err) {
      logger.error(err)
    }
  }

  configureNunjucks() {
    const paths = [this.tplPath, utils.getComponentsPath()].filter(Boolean)
    nunjucks.configure(paths, { autoescape: false })
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
