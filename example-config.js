const path = require('path')

function createConfig() {
  const dirs = {
    templates: './templates',
    scss: './scss',
    build: './build',
    cache: './cache',
    components: './components'
  }

  return {
    DIRS: {
      TEMPLATES: path.join(__dirname, dirs.templates),
      COMPONENTS: path.join(__dirname, dirs.components),
      BUILD: path.join(__dirname, dirs.build),
      CACHE: path.join(__dirname, dirs.cache)
    },
    FILES: {
      SCSS: path.join(dirs.scss, '**/*'),
      TEMPLATES: path.join(dirs.templates, '**/*')
    }
  }
}

module.exports = createConfig()
