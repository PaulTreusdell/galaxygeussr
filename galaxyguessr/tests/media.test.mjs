import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { once } from 'node:events'

test('production server supports audio probing, seeking, suffixes and HEAD', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'galaxy-media-'))
  const child = spawn(process.execPath, ['dist/node/server.mjs'], { env: { ...process.env, PORT: '0', DATABASE_PATH: path.join(directory, 'test.sqlite') }, stdio: ['ignore','pipe','pipe'] })
  try {
    const address = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 10000)
      child.once('error', reject)
      child.stdout.on('data', chunk => { const m = chunk.toString().match(/port (\d+)/); if (m) { clearTimeout(timeout); resolve('http://127.0.0.1:' + m[1]) } })
    })
    const original = readFileSync('public/audio/mars-clue-0.mp3')
    for (const [range, start, end] of [['bytes=0-1',0,1],['bytes=100-199',100,199],['bytes=-64',original.length-64,original.length-1],['bytes=100-',100,original.length-1]]) {
      const response = await fetch(address + '/audio/mars-clue-0.mp3', {headers:{range}})
      assert.equal(response.status,206)
      assert.equal(response.headers.get('accept-ranges'),'bytes')
      assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/${original.length}`)
      assert.deepEqual(Buffer.from(await response.arrayBuffer()),original.subarray(start,end+1))
    }
    const invalid = await fetch(address + '/audio/mars-clue-0.mp3',{headers:{range:'bytes=99999999-'}})
    assert.equal(invalid.status,416)
    const head = await fetch(address + '/audio/mars-clue-0.mp3',{method:'HEAD'})
    assert.equal(Number(head.headers.get('content-length')),original.length)
    assert.equal((await head.arrayBuffer()).byteLength,0)
    const full = await fetch(address + '/audio/mars-clue-0.mp3')
    assert.equal(full.status,200)
    assert.deepEqual(Buffer.from(await full.arrayBuffer()),original)
  } finally {
    const exited = once(child,'exit'); child.kill(); await exited
    rmSync(directory,{recursive:true,force:true})
  }
})
