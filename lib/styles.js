const path = require('path')
const autoprefixer = require('autoprefixer')
const cache = require('memory-cache')
const cssnano = require('cssnano')
const fse = require('fs-extra')
const mqpacker = require('css-mqpacker')
const postcss = require('postcss')
const Promise = require('bluebird')
const sass = require('node-sass')

const config = require('./config')
const logger = require('./logger')

Promise.promisifyAll(fse)
Promise.promisifyAll(sass)

class Styles {
  constructor(tplPath) {
    this.tplPath = tplPath
    this.tplName = path.parse(tplPath).base
    this.css = {
      customResets: {
        resetHead: false,
        resetInline: false
      }
    }
  }

  /** MAIN METHODS **/

  get() {
    return this.compile()
      .then(styles => this.separateStyles(styles))
      .catch(err => {
        logger.error(err)
      })
  }

  compile() {
    const promises = [
      this.compileMainStyles(),
      this.compileResetStyles('resetHead'),
      this.compileResetStyles('resetInline')
    ]

    return Promise.all(promises)
      .then(([main, head, inline]) => {
        this.css.main = main
        this.css.reset = { head, inline }
        return this.css
      })
      .catch(err => {
        logger.error(err)
      })
  }

  separateStyles() {
    this.css.head = this.css.reset.head + this.css.main.head
    this.css.inline = this.css.reset.inline + this.css.main.inline
    return this.css
  }

  /** AUXILIARY METHODS **/

  compileMainStyles() {
    const sassPath = path.join(this.tplPath, config.files.styles)

    return this.compileSass(sassPath)
      .then(styles => this.separateHeadStyles(styles, sassPath))
      .catch(err => {
        logger.error(err)
      })
  }

  compileResetStyles(styleName) {
    let resetPath = path.join(this.tplPath, config.files[styleName])

    const _compile = (resetPath, savePath) => {
      // compile the reset styles
      return this.compileSass(resetPath, savePath).then(compiledStyles => {
        // add styles to cache if they are common styles
        if (!this.css.customResets[styleName]) {
          cache.put(styleName, compiledStyles)
        }
        return compiledStyles
      })
    }

    // look for custom reset styles first
    return (
      fse
        .accessAsync(resetPath)

        // custom reset styles found
        .then(() => {
          const savePath = getSavePath(config.dirs.build, this.tplName)
          this.css.customResets[styleName] = true
          return _compile(resetPath, savePath)
        })

        // custom reset styles do not exist
        .catch(() => {
          // check to see if a cached version of the styles exists
          const cached = cache.get(styleName)
          if (cached) {
            return cached
          }

          // otherwise, compile the common reset styles
          const savePath = getSavePath(config.dirs.build)
          resetPath = path.join(config.dirs.common, config.files[styleName])
          return _compile(resetPath, savePath)
        })
    )
  }

  compileSass(
    sassPath,
    savePath = getSavePath(config.dirs.build, this.tplName)
  ) {
    const saveFilename = path.join(savePath, `${path.parse(sassPath).name}.css`)

    const sassOpts = {
      file: sassPath,
      outputStyle: 'expanded',
      sourceMapEmbed: true,
      outFile: saveFilename,
      sourceMapContents: true
    }

    const autoprefixerOpts = {
      browsers: ['last 2 version']
    }

    return sass
      .renderAsync(sassOpts)
      .then(({ css }) => {
        return postcss([autoprefixer(autoprefixerOpts)]).process(css, {
          from: sassPath,
          to: savePath
        })
      })
      .then(({ css }) => {
        fse.outputFileAsync(saveFilename, css)
        return css
      })
  }

  separateHeadStyles(unseparatedStyles, path) {
    let inline
    const head = postcss.parse('')

    const inlinePostcssPlugins = [
      // extract media queries, fonts to head
      postcssExtractHeadStyles(head),
      // minify
      cssnano()
    ]

    const headPostcssPlugins = [
      // add !important to all declarations
      postcssImportantEverything,
      // combine media queries
      mqpacker,
      // minify
      cssnano({ discardUnused: { fontFace: false } })
    ]

    return postcss(inlinePostcssPlugins)
      .process(unseparatedStyles, { from: path })
      .then(({ css }) => {
        inline = css
      })
      .then(() => postcss(headPostcssPlugins).process(head, { from: path }))
      .then(({ css }) => ({
        head: css,
        inline
      }))
  }
}

/** POSTCSS PLUGINS **/

const postcssImportantEverything = postcss.plugin(
  'postcss-important-everything',
  () => css => {
    css.walkDecls(decl => {
      if (decl.parent.name !== 'font-face') {
        decl.important = true
      }
    })
  }
)

const pseudoClasses = [':hover', ':visited', ':active', ':focus']
const isPseudoClass = selector =>
  pseudoClasses.some(pseudoClass => selector.includes(pseudoClass))

const postcssExtractHeadStyles = styles =>
  postcss.plugin('postcss-extract-media', () => css => {
    css.walk(node => {
      switch (node.type) {
        case 'atrule': {
          if (node.name.match(/^(media|import|font-face)/)) {
            styles.append(node)
          }
          break
        }

        case 'rule': {
          if (node.selectors.some(isPseudoClass)) {
            styles.append(node)
          }
          break
        }

        default:
          break
      }
    })
  })

/** UTILITY **/

function getSavePath(buildDir, tplName = '') {
  return path.join(buildDir, tplName, tplName ? 'css' : 'common')
}

module.exports = Styles
