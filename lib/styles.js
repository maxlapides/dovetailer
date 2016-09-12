'use strict'

const path         = require('path')
const _            = require('lodash')
const autoprefixer = require('autoprefixer')
const cache        = require('memory-cache')
const css          = require('css')
const fse          = require('fs-extra')
const mqpacker     = require('css-mqpacker')
const postcss      = require('postcss')
const Promise      = require('bluebird')
const sass         = require('node-sass')
const utils        = require('./utils.js')

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

/** * MAIN METHODS ***/

styles.prototype.get = function() {
    return this.compile()
        .then(this.separateStyles.bind(this))
        .catch(function(err) {
            utils.logError(6, err)
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
        .then(function(compiled) {

            that.css.main = compiled[0]
            that.css.reset = {
                head   : compiled[1],
                inline : compiled[2]
            }

            return that.css

        })
        .catch(function(err) {
            utils.logError(7, err)
        })

}

styles.prototype.separateStyles = function() {
    this.css.head   = this.css.reset.head + this.css.main.head
    this.css.inline = this.css.reset.inline + this.css.main.inline
    return Promise.resolve(this.css)
}

/** * AUXILIARY METHODS ***/

styles.prototype.compileMainStyles = function() {

    const sassPath = path.join(this.tplPath, this.config.files.styles)

    return this.compileSass(sassPath)
        .then(this.separateMediaQueries.bind(this))
        .catch(function(err) {
            utils.logError(8, err)
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

    const ast = css.parse(unseparatedStyles)
    let mqast = css.parse('')

    let mediaQuery
    const rules = ast.stylesheet.rules

    for (let i = 0; i < rules.length; i++) {
        if (rules[i].type === 'media') {
            mediaQuery = _.first(rules.splice(i, 1))
            mqast = this.addRuleToAST(mqast, mediaQuery)
        }
    }

    function stringify(astToStringify) {
        return css.stringify(astToStringify, {
            compress: true,
            sourcemap: false
        })
    }

    let head = stringify(mqast)
    const inline = stringify(ast)

    const addImportantRuleToAll = postcss(function(cssToModify) {
        cssToModify.walkDecls(function(decl) {
            decl.important = true
        })
    })

    head = postcss()
        .use(addImportantRuleToAll) // add !important to all declarations
        .use(mqpacker)                // combine media queries
        .process(head)

    const separatedCSS = {
        head   : head,
        inline : inline
    }

    return Promise.resolve(separatedCSS)

}

styles.prototype.addRuleToAST = function(ast, rule) {
    ast.stylesheet.rules.push(rule)
    return ast
}

module.exports = styles
