'use strict'

const path         = require('path')
const autoprefixer = require('autoprefixer')
const cache        = require('memory-cache')
const cssnano      = require('cssnano')
const fse          = require('fs-extra')
const mqpacker     = require('css-mqpacker')
const postcss      = require('postcss')
const Promise      = require('bluebird')
const sass         = require('node-sass')

const logger       = require('./logger.js')

Promise.promisifyAll(fse)
Promise.promisifyAll(sass)

const styles = function(tplPath) {
    this.tplPath = tplPath
    this.tplName = path.parse(tplPath).base
    this.config = cache.get('config')
    this.css = {
        customResets: {
            resetHead: false,
            resetInline: false
        }
    }
}

/** MAIN METHODS **/

styles.prototype.get = function() {
    return this.compile()
        .then(this.separateStyles.bind(this))
        .catch(err => {
            logger.error(err)
        })
}

styles.prototype.compile = function() {

    const promises = [
        this.compileMainStyles(),
        this.compileResetStyles('resetHead'),
        this.compileResetStyles('resetInline')
    ]

    const that = this

    return Promise.all(promises)
        .then(compiled => {
            that.css.main = compiled[0]
            that.css.reset = {
                head   : compiled[1],
                inline : compiled[2]
            }
            return that.css
        })
        .catch(err => {
            logger.error(err)
        })

}

styles.prototype.separateStyles = function() {
    this.css.head   = this.css.reset.head + this.css.main.head
    this.css.inline = this.css.reset.inline + this.css.main.inline
    return Promise.resolve(this.css)
}

/** AUXILIARY METHODS **/

styles.prototype.compileMainStyles = function() {

    const sassPath = path.join(this.tplPath, this.config.files.styles)

    return this.compileSass(sassPath)
        .then(this.separateMediaQueries.bind(this))
        .catch(err => {
            logger.error(err)
        })

}

styles.prototype.compileResetStyles = function(styleName) {

    const that = this
    let savePath
    let resetPath = path.join(this.tplPath, this.config.files[styleName])

    function _compile() {
        // compile the reset styles
        return that.compileSass(resetPath, savePath).then(function(compiledStyles) {
            // add styles to cache if they are common styles
            if (!that.css.customResets[styleName]) {
                cache.put(styleName, compiledStyles)
            }
            return compiledStyles
        })
    }

    // look for custom reset styles first
    return fse.accessAsync(resetPath)

        // custom reset styles found
        .then(function() {
            savePath = path.join(that.config.dirs.build, that.tplName, 'css')
            that.css.customResets[styleName] = true
            return _compile()
        })

        // custom reset styles do not exist
        .catch(function() {
            // check to see if a cached version of the styles exists
            const cached = cache.get(styleName)
            if (cached) {
                return cached
            }

            // otherwise, compile the common reset styles
            savePath = path.join(that.config.dirs.build, 'common')
            resetPath = path.join(that.config.dirs.common, that.config.files[styleName])
            return _compile()
        })

}

styles.prototype.compileSass = function(sassPath, savePath) {

    // set the save path if it does not already exist
    savePath = savePath || path.join(this.config.dirs.build, this.tplName, 'css')

    const sassOpts = {
        file: sassPath,
        outputStyle: 'expanded'
    }

    const autoprefixerOpts = {
        browsers: ['last 2 version']
    }

    return sass.renderAsync(sassOpts)
        .then(function(sassOutput) {
            return postcss([autoprefixer(autoprefixerOpts)])
                .process(sassOutput.css, {from: sassPath, to: savePath})
        })
        .then(function(postcssOutput) {
            const saveFilename = path.join(savePath, `${path.parse(sassPath).name}.css`)
            fse.ensureFileAsync(saveFilename).then(function() {
                fse.writeFileSync(saveFilename, postcssOutput.css)
            })
            return postcssOutput.css
        })

}

styles.prototype.separateMediaQueries = function(unseparatedStyles) {

    let inline
    const head = postcss.parse('')

    const inlinePostcssPlugins = [
        postcssExtractMedia(head),  // extract media queries to head
        cssnano()                   // minify
    ]

    const headPostcssPlugins = [
        postcssImportantEverything, // add !important to all declarations
        mqpacker,                   // combine media queries
        cssnano()                   // minify
    ]

    return postcss(inlinePostcssPlugins)
        .process(unseparatedStyles)
        .then(res => inline = res.css)
        .then(() => postcss(headPostcssPlugins).process(head))
        .then(res => ({
            head: res.css,
            inline
        }))

}

/** POSTCSS PLUGINS **/

const postcssImportantEverything = postcss.plugin(
    'postcss-important-everything',
    () => (
        css => {
            css.walkDecls(function(decl) {
                decl.important = true
            })
        }
    )
)

const postcssExtractMedia = mediaStyles => (
    postcss.plugin(
        'postcss-extract-media',
        () => (
            css => {
                css.walkAtRules(function(rule) {
                    if (rule.name.match(/^media/)) {
                        mediaStyles.append(rule)
                        rule.remove()
                    }
                })
                mediaStyles.toString()
            }
        )
    )
)

module.exports = styles
