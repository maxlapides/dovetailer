const path = require('path')
const gulp = require('gulp')
const browserSync = require('browser-sync').create()
const compiler = require('dovetailer')
const config = require('./config') // your config

// GULP TASKS

gulp.task('default', ['compile', 'watch'])

gulp.task('compile', compile)

gulp.task('watch', function() {
  gulp.watch(config.FILES.TEMPLATES, compile)
  gulp.watch([config.FILES.PARTIALS, config.FILES.SCSS], () => compile)
})

// BUILD METHODS

function compile(event) {
  const templatePath =
    event && event.path ? path.parse(event.path).dir : config.DIRS.TEMPLATES
  const partialsPath = config.DIRS.PARTIALS
  return compiler(templatePath, partialsPath).then(reload)
}

function reload() {
  return browserSync.active ? browserSync.reload() : startServer()
}

function startServer() {
  const serverConfig = {
    server: {
      baseDir: 'build',
      directory: true
    }
  }
  return browserSync.init(serverConfig)
}
