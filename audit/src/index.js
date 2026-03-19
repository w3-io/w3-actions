import * as core from '@actions/core'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const wasm = require('../wasm-bridge/pkg/w3_audit_wasm.js')

try {
  const category = core.getInput('category', { required: true })
  const message = core.getInput('message', { required: true })
  const data = core.getInput('data') || '{}'
  const workflow = core.getInput('workflow') || ''
  const job = core.getInput('job') || ''
  const step = core.getInput('step') || ''
  const timestamp = new Date().toISOString()

  // WASM creates the sequenced entry
  const entryJson = wasm.create_entry(category, message, data, workflow, job, step, timestamp)

  core.setOutput('result', entryJson)

  const entry = JSON.parse(entryJson)
  core.summary
    .addHeading('Audit Entry', 3)
    .addRaw(`**#${entry.sequence}** \`${entry.category}\`: ${entry.message}\n`)
    .write()
} catch (error) {
  core.setFailed(error.message)
}
