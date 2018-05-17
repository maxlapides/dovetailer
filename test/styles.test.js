import test from 'ava'
import StylesLib from '../lib/styles'

const newStyles = () => new StylesLib('../templates')

test('separateStyles', async t => {
  const styles = newStyles()

  styles.css = {
    reset: {
      head: 'h1 { color: red }',
      inline: 'h2 { color: pink }'
    },
    main: {
      head: 'h3 { color: blue }',
      inline: 'h4 { color: purple }'
    }
  }

  const separatedStyles = await styles.separateStyles()

  t.deepEqual(separatedStyles.head, 'h1 { color: red }h3 { color: blue }')
  t.deepEqual(separatedStyles.inline, 'h2 { color: pink }h4 { color: purple }')
})

test('separateHeadStyles', async t => {
  const styles = newStyles()

  const css = `
        @media (max-width: 600px) {
            tr { color: yellow; }
        }
        table { background: orange; }
        @media (max-width: 600px) {
            table { background: magenta; }
        }
        a { text-decoration: none; }
        a:hover { text-decoration: underline; }
    `
  const separatedStyles = await styles.separateHeadStyles(css)

  const expectedStyles = {
    head:
      'a:hover{text-decoration:underline!important}@media (max-width:600px){tr{color:#ff0!important}table{background:#f0f!important}}',
    inline: 'table{background:orange}a{text-decoration:none}'
  }

  t.deepEqual(separatedStyles, expectedStyles)
})
