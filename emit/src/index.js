import * as core from '@actions/core'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const wasm = require('../wasm-bridge/pkg/w3_emit_wasm.js')

async function run() {
  try {
    const name = core.getInput('name', { required: true })
    const payload = core.getInput('payload') || '{}'
    const webhookUrl = core.getInput('webhook-url', { required: true })
    const webhookSecret = core.getInput('webhook-secret') || ''
    const source = core.getInput('source') || ''
    const step = core.getInput('step') || ''
    const timestamp = new Date().toISOString()

    // WASM prepares the event body and computes HMAC signature
    const prepared = JSON.parse(
      wasm.prepare_event(name, payload, source, step, timestamp, webhookSecret),
    )

    // JS handles the actual HTTP delivery
    const headers = { 'Content-Type': 'application/json' }
    if (prepared.signature) {
      headers['X-W3-Signature'] = prepared.signature
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: prepared.body,
    })

    const result = {
      eventName: name,
      timestamp,
      delivered: response.ok,
      status: response.status,
      signature: prepared.signature || null,
    }

    core.setOutput('result', JSON.stringify(result))

    core.summary
      .addHeading('Event Emitted', 3)
      .addRaw(`**${name}** → \`${webhookUrl}\` (${response.status})\n`)
      .write()
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
