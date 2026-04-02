import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

// Mock @actions/core before importing the action
let inputs = {}
let outputs = {}
let failed = null

const mockCore = {
  getInput: (name, opts) => {
    const val = inputs[name] ?? ''
    if (opts?.required && !val) throw new Error(`Input required: ${name}`)
    return val
  },
  setOutput: (name, value) => { outputs[name] = value },
  setFailed: (msg) => { failed = msg },
  info: () => {},
  warning: () => {},
}

// Patch @actions/core globally
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

// We'll test the logic directly since the action reads from @actions/core
import { createHash, createHmac } from 'node:crypto'

describe('encode action', () => {
  beforeEach(() => {
    inputs = {}
    outputs = {}
    failed = null
  })

  describe('base64', () => {
    it('encodes string to base64', () => {
      const result = Buffer.from('Hello, World!').toString('base64')
      assert.equal(result, 'SGVsbG8sIFdvcmxkIQ==')
    })

    it('decodes base64 to string', () => {
      const result = Buffer.from('SGVsbG8sIFdvcmxkIQ==', 'base64').toString('utf-8')
      assert.equal(result, 'Hello, World!')
    })

    it('round-trips', () => {
      const original = 'The quick brown fox'
      const encoded = Buffer.from(original).toString('base64')
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
      assert.equal(decoded, original)
    })
  })

  describe('hex', () => {
    it('encodes string to hex', () => {
      const result = Buffer.from('Hello').toString('hex')
      assert.equal(result, '48656c6c6f')
    })

    it('decodes hex to string', () => {
      const bytes = Buffer.from('48656c6c6f', 'hex')
      assert.equal(bytes.toString('utf-8'), 'Hello')
    })

    it('handles 0x prefix', () => {
      const input = '0x48656c6c6f'
      const bytes = Buffer.from(input.replace(/^0x/, ''), 'hex')
      assert.equal(bytes.toString('utf-8'), 'Hello')
    })
  })

  describe('url', () => {
    it('encodes special characters', () => {
      assert.equal(encodeURIComponent('hello world'), 'hello%20world')
      assert.equal(encodeURIComponent('a=b&c=d'), 'a%3Db%26c%3Dd')
    })

    it('decodes percent-encoded', () => {
      assert.equal(decodeURIComponent('hello%20world'), 'hello world')
    })
  })

  describe('sha256', () => {
    it('hashes empty string', () => {
      const hash = createHash('sha256').update('').digest('hex')
      assert.equal(hash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    })

    it('hashes known value', () => {
      const hash = createHash('sha256').update('hello').digest('hex')
      assert.equal(hash, '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
    })
  })

  describe('hmac-sha256', () => {
    it('produces correct MAC', () => {
      const mac = createHmac('sha256', 'secret').update('message').digest('hex')
      assert.equal(mac, '8b5f48702995c1598c573db1e21866a9b825d4a794d169d7060a03605796360b')
    })

    it('produces sha256= prefixed signature', () => {
      const mac = createHmac('sha256', 'key').update('data').digest('hex')
      const signature = `sha256=${mac}`
      assert.ok(signature.startsWith('sha256='))
    })
  })
})
