import test from 'ava'
import StylesLib from '../lib/styles'

const newStyles = () => new StylesLib('../templates')

test('separateStyles', async t => {
  const styles = newStyles()

  styles.css = {
    reset: {
      head: 'reset head',
      inline: 'reset inline'
    },
    main: {
      head: 'main head',
      inline: 'main inline'
    }
  }

  const separatedStyles = await styles.separateStyles()

  t.deepEqual(separatedStyles.head, 'reset headmain head')
  t.deepEqual(separatedStyles.inline, 'reset inlinemain inline')
})

test('separateMediaQueries', async t => {
  const styles = newStyles()

  const css = `
        @media (max-width: 600px) {
            tr { color: yellow; }
        }
        table { background: orange; }
        @media (max-width: 600px) {
            table { background: magenta; }
        }
    `
  const separatedStyles = await styles.separateMediaQueries(css)

  const expectedStyles = {
    head:
      '@media (max-width:600px){tr{color:#ff0!important}table{background:#f0f!important}}',
    inline: 'table{background:orange}'
  }

  t.deepEqual(separatedStyles, expectedStyles)
})
