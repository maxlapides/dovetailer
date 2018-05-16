const path = require('path')
const _ = require('lodash')
const nunjucks = require('nunjucks')
const Promise = require('bluebird')
const marked = require('marked')
const { detergent } = require('detergent')
const fse = require('fs-extra')

const utils = require('./utils')
const logger = require('./logger')

// configure Nunjucks
const paths = [utils.getTemplatesPath(), utils.getComponentsPath()].filter(
  Boolean
)
nunjucks.configure(paths, { autoescape: false })

// create a renderer for marked
// do not wrap paragraphs in <p>
// do not automatically convert http://... to <a>s
const renderer = new marked.Renderer()
const defaultRenderer = new marked.Renderer()
renderer.paragraph = text => text
renderer.link = (href, title, text) => {
  if (href === text) {
    return href
  }
  return defaultRenderer.link(href, title, text)
}

class NunjucksCompiler {
  constructor(tplPath) {
    this.tplPath = tplPath
  }

  async get() {
    try {
      const context = await this.requireContext()

      // render HTML and text versions with Nunjucks
      // HTML version context is parsed as Markdown
      const [html, text] = await Promise.all([
        this.render(
          path.join(this.tplPath, 'html.njk'),
          this.cleanContext(context, true)
        ),
        this.render(
          path.join(this.tplPath, 'text.njk'),
          this.cleanContext(context)
        )
      ])
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
      return contextStr ? JSON.parse(contextStr) : {}
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

  cleanContext(data, htmlVersion = false) {
    // no need to clean if data is a number, null, or undefined
    if (_.isFinite(data) || _.isNil(data)) {
      return data
    }

    // string
    if (_.isString(data)) {
      // clean with detergent
      const cleanData = detergent(data, {
        addMissingSpaces: false,
        removeWidows: htmlVersion,
        convertEntities: htmlVersion
      }).res
      return htmlVersion ? marked(cleanData, { renderer }) : cleanData
    }

    // array
    if (_.isArray(data)) {
      return data.map(item => this.cleanContext(item, htmlVersion))
    }

    // object
    return Object.entries(data).reduce((out, [key, val]) => {
      out[key] = this.cleanContext(val, htmlVersion)
      return out
    }, {})
  }
}

module.exports = NunjucksCompiler
