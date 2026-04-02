import * as core from '@actions/core'
import { createHmac } from 'node:crypto'
import { handleError, setJsonOutput } from '@w3-io/action-core'

/**
 * Emit action — deliver webhook events with HMAC signatures.
 * Pure Node.js, no WASM.
 */
async function main() {
  const name = core.getInput('name', { required: true })
  const payload = core.getInput('payload') || '{}'
  const webhookUrl = core.getInput('webhook-url', { required: true })
  const webhookSecret = core.getInput('webhook-secret') || ''
  const source = core.getInput('source') || ''
  const step = core.getInput('step') || ''
  const timestamp = new Date().toISOString()

  // Build event body
  const event = {
    name,
    payload: JSON.parse(payload),
    source: source || undefined,
    step: step || undefined,
    timestamp,
  }
  const body = JSON.stringify(event)

  // Compute HMAC signature if secret provided
  let signature = null
  if (webhookSecret) {
    const mac = createHmac('sha256', webhookSecret).update(body).digest('hex')
    signature = `sha256=${mac}`
  }

  // Deliver
  const headers = { 'Content-Type': 'application/json' }
  if (signature) headers['X-W3-Signature'] = signature

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body,
  })

  setJsonOutput('result', {
    eventName: name,
    timestamp,
    delivered: response.ok,
    status: response.status,
    signature,
  })
}

main().catch(handleError)
