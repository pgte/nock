'use strict'

const zlib = require('zlib')
const { expect } = require('chai')
const nock = require('..')
const assertRejects = require('assert-rejects')
const { startHttpServer } = require('./servers')

describe('Native Fetch', () => {
  it('input is string', async () => {
    const scope = nock('http://example.test').get('/').reply()

    const { status } = await fetch('http://example.test/')
    expect(status).to.equal(200)
    scope.done()
  })

  it('input is URL', async () => {
    const scope = nock('http://example.test').get('/').reply()

    const { status } = await fetch(new URL('http://example.test/'))
    expect(status).to.equal(200)
    scope.done()
  })

  it('input is Request object', async () => {
    const scope = nock('http://example.test').get('/').reply()

    const { status } = await fetch(new Request('http://example.test/'))
    expect(status).to.equal(200)
    scope.done()
  })

  it('filter by body', async () => {
    const scope = nock('http://example.test')
      .post('/', { test: 'fetch' })
      .reply()

    const { status } = await fetch('http://example.test/', {
      method: 'POST',
      body: JSON.stringify({ test: 'fetch' }),
    })
    expect(status).to.equal(200)
    scope.done()
  })

  it('filter by request body', async () => {
    const scope = nock('http://example.test')
      .post('/', { test: 'fetch' })
      .reply()

    const { status } = await fetch(
      new Request('http://example.test/', {
        method: 'POST',
        body: JSON.stringify({ test: 'fetch' }),
      }),
    )
    expect(status).to.equal(200)
    scope.done()
  })

  it('no match', async () => {
    nock('http://example.test').get('/').reply()

    await assertRejects(
      fetch('http://example.test/wrong-path'),
      /Nock: No match for request/,
    )
  })

  it('forward request if no mock', async () => {
    const { origin } = await startHttpServer((request, response) => {
      response.write('live')
      response.end()
    })

    const { status } = await fetch(origin)
    expect(status).to.equal(200)
  })

  it('should work with empty response', async () => {
    nock('http://example.test').get('/').reply(204)

    const { status } = await fetch('http://example.test')
    expect(status).to.equal(204)
  })

  it('should work https', async () => {
    nock('https://example.test').get('/').reply()

    const { status } = await fetch('https://example.test')
    expect(status).to.equal(200)
  })

  it('should set the statusText according to the response code', async () => {
    nock('https://example.test').get('/').reply(404)

    const { status, statusText } = await fetch('https://example.test')
    expect(status).to.equal(404)
    expect(statusText).to.equal('Not Found')
  })

  it('should return mocked response', async () => {
    const message = 'Lorem ipsum dolor sit amet'
    const scope = nock('http://example.test').get('/foo').reply(200, message)

    const response = await fetch('http://example.test/foo')

    expect(response.status).to.equal(200)
    expect(await response.text()).to.equal(message)
    scope.done()
  })

  it('should accept gzipped content', async () => {
    const message = 'Lorem ipsum dolor sit amet'
    const compressed = zlib.gzipSync(message)

    const scope = nock('http://example.test')
      .get('/foo')
      .reply(200, compressed, {
        'X-Transfer-Length': String(compressed.length),
        'Content-Length': undefined,
        'Content-Encoding': 'gzip',
      })
    const response = await fetch('http://example.test/foo')

    expect(response.status).to.equal(200)
    expect(await response.text()).to.equal(message)
    scope.done()
  })
})
