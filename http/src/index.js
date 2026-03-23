import * as core from '@actions/core'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const wasm = require('../wasm-bridge/pkg/w3_http_wasm.js')

// JS transport: provides fetch() and sleep() to the WASM retry logic
async function jsFetch(method, url, headersJson, requestBody) {
  const headers = JSON.parse(headersJson || '[]')
  const headerObj = {}
  for (const [k, v] of headers) headerObj[k] = v

  const opts = { method, headers: headerObj }
  if (requestBody) opts.body = requestBody

  const resp = await fetch(url, opts)
  const body = await resp.text()
  const respHeaders = JSON.stringify([...resp.headers.entries()])

  return { status: resp.status, headers: respHeaders, body }
}

function jsSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run() {
  try {
    const method = core.getInput('method') || 'GET'
    const url = core.getInput('url', { required: true })
    const headersJson = core.getInput('headers') || '[]'
    const body = core.getInput('body') || ''
    const maxRetries = parseInt(core.getInput('max-retries') || '3')
    const retryDelay = parseInt(core.getInput('retry-delay') || '2000')
    const timeout = parseInt(core.getInput('timeout') || '30000')

    // Call WASM — retry logic runs in Rust, I/O via JS callbacks
    const resultJson = await wasm.execute(
      jsFetch,
      jsSleep,
      method,
      url,
      headersJson,
      body,
      maxRetries,
      retryDelay,
      timeout,
    )

    core.setOutput('result', resultJson)

    const result = JSON.parse(resultJson)
    core.summary
      .addHeading('HTTP Request', 3)
      .addRaw(`**${method}** \`${url}\` → **${result.status}**\n`)
      .write()
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
