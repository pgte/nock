'use strict'

const { expect } = require('chai')
const http = require('http')
const querystring = require('querystring')
const { test } = require('tap')
const nock = require('..')

require('./cleanup_after_each')()
require('./setup')

function ignore() {}

test('emits request and replied events', function(t) {
  const scope = nock('http://example.test')
    .get('/please')
    .reply(200)

  scope.on('request', function(req, interceptor) {
    expect(req.path).to.equal('/please')
    expect(interceptor.interceptionCounter).to.equal(0)
    scope.on('replied', function(req, interceptor) {
      expect(req.path).to.equal('/please')
      expect(interceptor.interceptionCounter).to.equal(1)
      t.end()
    })
  })

  http.get('http://example.test/please')
})

test('emits request and request body', function(t) {
  const data = querystring.stringify({
    example: 123,
  })

  const scope = nock('http://example.test')
    .post('/please')
    .reply(200)

  scope.on('request', function(req, interceptor, body) {
    expect(req.path).to.equal('/please')
    expect(interceptor.interceptionCounter).to.equal(0)
    expect(body).to.deep.equal(data)
    scope.on('replied', function(req, interceptor) {
      expect(req.path).to.equal('/please')
      expect(interceptor.interceptionCounter).to.equal(1)
      t.end()
    })
  })

  const req = http.request({
    hostname: 'example.test',
    method: 'POST',
    path: '/please',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data),
    },
  })

  req.write(data)
  req.end()
})

test('emits no match when no match and no mock', function(t) {
  nock.emitter.once('no match', function() {
    t.end()
  })

  const req = http.get('http://example.test/abc')
  req.once('error', ignore)
})

test('emits no match when no match and mocked', function(t) {
  nock('http://example.test')
    .get('/')
    .reply(418)

  const assertion = function(req) {
    expect(req.path).to.equal('/definitelymaybe')
    nock.emitter.removeAllListeners('no match')
    t.end()
  }
  nock.emitter.on('no match', assertion)

  http.get('http://example.test/definitelymaybe').once('error', ignore)
})

test('emits no match when netConnect is disabled', function(t) {
  nock.disableNetConnect()
  nock.emitter.on('no match', function(req) {
    expect(req.hostname).to.equal('example.test')
    nock.emitter.removeAllListeners('no match')
    t.end()
  })
  http.get('http://example.test').once('error', ignore)
})
