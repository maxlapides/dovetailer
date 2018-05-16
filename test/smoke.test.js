import path from 'path'
import fs from 'fs'
import test from 'ava'
import del from 'del'
import Promise from 'bluebird'
import compiler from '../index'

const readFile = Promise.promisify(fs.readFile)

test.before(async () => {
  return await del('./build').then(() =>
    compiler(path.join(__dirname, '../templates'))
  )
})

test('text version is correct', async t => {
  const textFile = readFile('./build/example/example.txt', 'utf8')
  t.is(await textFile, 'This is a wonderful template.\n')
})

test('html prod version is exactly one line', async t => {
  const htmlFile = await readFile('./build/example/example.html', 'utf8')
  const htmlFileLines = htmlFile.split(/\r\n|\r|\n/).length
  t.true(htmlFile.length > 1)
  t.is(htmlFileLines, 1)
})
