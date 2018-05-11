const path = require('path')

function createConfig() {
  const dirs = {
    templates: './templates',
    scss: './scss',
    partials: './partials'
  }

  return {
    DIRS: {
      PARTIALS: path.join(__dirname, dirs.partials),
      TEMPLATES: path.join(__dirname, dirs.templates)
    },
    FILES: {
      PARTIALS: path.join(dirs.partials, '**/*'),
      SCSS: path.join(dirs.scss, '**/*'),
      TEMPLATES: path.join(dirs.templates, '**/*')
    }
  }
}

module.exports = createConfig()
