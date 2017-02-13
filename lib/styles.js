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
        .then(styles => this.separateStyles(styles))
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

styles.prototype.separateStyles = function() {
    this.css.head   = this.css.reset.head + this.css.main.head
    this.css.inline = this.css.reset.inline + this.css.main.inline
    return this.css
}

/** AUXILIARY METHODS **/

styles.prototype.compileMainStyles = function() {

    const sassPath = path.join(this.tplPath, this.config.files.styles)

    return this.compileSass(sassPath)
        .then(styles => this.separateMediaQueries(styles))
        .catch(err => {
            logger.error(err)
        })

}

styles.prototype.compileResetStyles = function(styleName) {

    let resetPath = path.join(this.tplPath, this.config.files[styleName])

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
    return fse.accessAsync(resetPath)

        // custom reset styles found
        .then(() => {
            const savePath = getSavePath(this.config.dirs.build, this.tplName)
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
            const savePath = getSavePath(this.config.dirs.build)
            resetPath = path.join(this.config.dirs.common, this.config.files[styleName])
            return _compile(resetPath, savePath)
        })

}

styles.prototype.compileSass = function(sassPath, savePath) {

    // set the save path if it does not already exist
    savePath = savePath || getSavePath(this.config.dirs.build, this.tplName)
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

    return sass.renderAsync(sassOpts)
        .then(sassOutput => {
            return postcss([autoprefixer(autoprefixerOpts)])
                .process(sassOutput.css, {from: sassPath, to: savePath})
        })
        .then(postcssOutput => {
            fse.outputFileAsync(saveFilename, postcssOutput.css)
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

/** UTILITY **/

function getSavePath(buildDir, tplName = '') {
    return path.join(buildDir, tplName, tplName ? 'css' : 'common')
}

module.exports = styles
