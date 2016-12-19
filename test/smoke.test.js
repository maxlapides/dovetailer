import fs from 'fs'
import test from 'ava'
import del from 'del'
import Promise from 'bluebird'
import compiler from '../index'

const readFile = Promise.promisify(fs.readFile)

test('text version is correct', async t => {
    const promise = del('./build')
        .then(() => compiler('./templates'))
        .then(() => readFile('./build/example/example.txt', 'utf8'))
    t.is(await promise, 'This is a wonderful template.\n')
})
