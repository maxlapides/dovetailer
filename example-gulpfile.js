const path = require('path')
const gulp = require('gulp')
const del = require('del')
const browserSync = require('browser-sync').create()
const compiler = require('dovetailer')
const config = require('./config')

// BUILD METHODS

const compile = async event => {
  const templatePath =
    event && event.path ? path.parse(event.path).dir : config.DIRS.TEMPLATES
  const changedFiles = await compiler(templatePath, {
    doctype: config.options.doctype
  })
  await reload(changedFiles)
}

const reload = changedFiles => {
  return browserSync.active ? browserSync.reload(changedFiles) : startServer()
}

const startServer = () => {
  return browserSync.init({
    server: {
      baseDir: config.DIRS.BUILD,
      directory: true
    },
    ui: false
  })
}

// GULP TASKS

gulp.task('default', ['compile', 'watch'])

gulp.task('clean', () => del([config.DIRS.BUILD, config.DIRS.CACHE]))

gulp.task('compile', ['clean'], compile)

gulp.task('watch', () => {
  gulp.watch(config.FILES.TEMPLATES, compile)
  gulp.watch(config.FILES.COMPONENTS, () => compile())
})
