import * as core from '@actions/core'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const wasm = require('../wasm-bridge/pkg/w3_json_wasm.js')

const COMMANDS = {
  extract: () => {
    const input = core.getInput('input', { required: true })
    const path = core.getInput('path', { required: true })
    return wasm.extract(input, path)
  },
  merge: () => {
    const input = core.getInput('input', { required: true })
    const overlay = core.getInput('overlay', { required: true })
    return wasm.merge(input, overlay)
  },
  filter: () => {
    const input = core.getInput('input', { required: true })
    const field = core.getInput('field', { required: true })
    const expected = core.getInput('expected', { required: true })
    return wasm.filter(input, field, expected)
  },
  'map-field': () => {
    const input = core.getInput('input', { required: true })
    const field = core.getInput('field', { required: true })
    return wasm.map_field(input, field)
  },
  count: () => {
    const input = core.getInput('input', { required: true })
    const n = wasm.count(input)
    return JSON.stringify({ count: n })
  },
  flatten: () => {
    const input = core.getInput('input', { required: true })
    return wasm.flatten(input)
  },
  pick: () => {
    const input = core.getInput('input', { required: true })
    const keys = core.getInput('keys', { required: true })
    return wasm.pick(input, keys)
  },
}

try {
  const command = core.getInput('command', { required: true })
  const handler = COMMANDS[command]

  if (!handler) {
    core.setFailed(`Unknown command: "${command}". Available: ${Object.keys(COMMANDS).join(', ')}`)
  } else {
    const result = handler()
    core.setOutput('result', result)
  }
} catch (error) {
  core.setFailed(error.message)
}
