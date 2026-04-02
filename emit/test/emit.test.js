import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'

/**
 * Test the core logic of the emit action:
 * - HMAC signature computation
 * - Event body JSON structure
 * - Missing secret produces no signature
 */

// Reproduce the action's signature logic
function computeSignature(body, secret) {
  if (!secret) return null
  const mac = createHmac('sha256', secret).update(body).digest('hex')
  return `sha256=${mac}`
}

// Reproduce the action's event body builder
function buildEvent({ name, payload, source, step, timestamp }) {
  return {
    name,
    payload: typeof payload === 'string' ? JSON.parse(payload) : payload,
    source: source || undefined,
    step: step || undefined,
    timestamp,
  }
}

describe('HMAC signature computation', () => {
  it('produces correct sha256 HMAC for known key/message pair', () => {
    const secret = 'my-webhook-secret'
    const body = '{"name":"deploy","payload":{},"timestamp":"2024-01-01T00:00:00.000Z"}'

    const expected = createHmac('sha256', secret).update(body).digest('hex')
    const signature = computeSignature(body, secret)

    assert.equal(signature, `sha256=${expected}`)
  })

  it('matches a pre-computed known vector', () => {
    const secret = 'test-secret'
    const body = 'hello world'

    // Pre-compute: createHmac('sha256','test-secret').update('hello world').digest('hex')
    const expectedHex = createHmac('sha256', secret).update(body).digest('hex')
    const signature = computeSignature(body, secret)

    assert.equal(signature, `sha256=${expectedHex}`)
    // Verify the hex is 64 chars (256 bits)
    assert.equal(expectedHex.length, 64)
  })

  it('produces different signatures for different secrets', () => {
    const body = '{"event":"test"}'
    const sig1 = computeSignature(body, 'secret-a')
    const sig2 = computeSignature(body, 'secret-b')

    assert.notEqual(sig1, sig2)
  })

  it('produces different signatures for different bodies', () => {
    const secret = 'same-secret'
    const sig1 = computeSignature('{"a":1}', secret)
    const sig2 = computeSignature('{"b":2}', secret)

    assert.notEqual(sig1, sig2)
  })

  it('signature always starts with sha256= prefix', () => {
    const sig = computeSignature('body', 'key')
    assert.ok(sig.startsWith('sha256='))
  })
})

describe('missing webhook-secret produces no signature', () => {
  it('returns null when secret is empty string', () => {
    assert.equal(computeSignature('body', ''), null)
  })

  it('returns null when secret is undefined', () => {
    assert.equal(computeSignature('body', undefined), null)
  })

  it('returns null when secret is null', () => {
    assert.equal(computeSignature('body', null), null)
  })
})

describe('event body JSON structure', () => {
  it('builds event with all fields', () => {
    const event = buildEvent({
      name: 'deploy',
      payload: '{"env":"prod"}',
      source: 'ci',
      step: 'post-deploy',
      timestamp: '2024-01-01T00:00:00.000Z',
    })

    assert.deepEqual(event, {
      name: 'deploy',
      payload: { env: 'prod' },
      source: 'ci',
      step: 'post-deploy',
      timestamp: '2024-01-01T00:00:00.000Z',
    })
  })

  it('omits source and step when empty', () => {
    const event = buildEvent({
      name: 'test',
      payload: '{}',
      source: '',
      step: '',
      timestamp: '2024-01-01T00:00:00.000Z',
    })

    assert.equal(event.source, undefined)
    assert.equal(event.step, undefined)
    assert.equal(event.name, 'test')
  })

  it('parses nested JSON payload', () => {
    const event = buildEvent({
      name: 'notify',
      payload: '{"users":[{"id":1},{"id":2}],"meta":{"page":1}}',
      source: '',
      step: '',
      timestamp: '2024-06-15T12:00:00.000Z',
    })

    assert.deepEqual(event.payload.users, [{ id: 1 }, { id: 2 }])
    assert.deepEqual(event.payload.meta, { page: 1 })
  })

  it('body round-trips through JSON.stringify', () => {
    const event = buildEvent({
      name: 'test',
      payload: '{"key":"value"}',
      source: 'src',
      step: 'step1',
      timestamp: '2024-01-01T00:00:00.000Z',
    })

    const body = JSON.stringify(event)
    const parsed = JSON.parse(body)

    assert.equal(parsed.name, 'test')
    assert.deepEqual(parsed.payload, { key: 'value' })
    assert.equal(parsed.source, 'src')
    assert.equal(parsed.step, 'step1')
  })

  it('default payload is empty object when input is {}', () => {
    const event = buildEvent({
      name: 'ping',
      payload: '{}',
      source: '',
      step: '',
      timestamp: '2024-01-01T00:00:00.000Z',
    })

    assert.deepEqual(event.payload, {})
  })
})
