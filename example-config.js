const path = require('path')

function createConfig() {
  const dirs = {
    templates: './templates',
    scss: './scss'
  }

  return {
    DIRS: {
      TEMPLATES: path.join(__dirname, dirs.templates)
    },
    FILES: {
      SCSS: path.join(dirs.scss, '**/*'),
      TEMPLATES: path.join(dirs.templates, '**/*')
    }
  }
}

module.exports = createConfig()
