import * as core from '@actions/core'
import { createRequire } from 'module'
import { readFileSync, writeFileSync } from 'fs'

const require = createRequire(import.meta.url)
const wasm = require('../wasm-bridge/pkg/w3_cloud_wasm.js')

const ENDPOINT = core.getInput('endpoint') || 'https://gateway.w3.cloud'
const REGION = core.getInput('region') || 'global'
const ACCESS_KEY = core.getInput('access-key', { required: true })
const SECRET_KEY = core.getInput('secret-key', { required: true })

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function host() {
  return ENDPOINT.replace('https://', '').replace('http://', '')
}

/** Sign and execute an HTTP request against W3.cloud.
 *  extraHeaders are included in the signed canonical request. */
async function execute(method, path, queryString, body, extraHeaders = {}) {
  const ts = timestamp()
  const extraJson = Object.keys(extraHeaders).length > 0
    ? JSON.stringify(Object.entries(extraHeaders))
    : ''

  const signed = JSON.parse(
    wasm.sign_request(
      method,
      path,
      queryString || '',
      host(),
      body || undefined,
      ACCESS_KEY,
      SECRET_KEY,
      REGION,
      ts,
      extraJson,
    ),
  )

  const headers = {}
  for (const [k, v] of signed.headers) headers[k] = v

  const url = ENDPOINT + path + (queryString ? `?${queryString}` : '')
  const resp = await fetch(url, {
    method,
    headers,
    body: body || undefined,
  })

  return resp
}

const COMMANDS = {
  upload: runUpload,
  download: runDownload,
  delete: runDelete,
  list: runList,
  'list-buckets': runListBuckets,
  'create-bucket': runCreateBucket,
  'delete-bucket': runDeleteBucket,
  head: runHead,
  presign: runPresign,
  copy: runCopy,
}

async function run() {
  try {
    const command = core.getInput('command', { required: true })
    const handler = COMMANDS[command]

    if (!handler) {
      core.setFailed(`Unknown command: "${command}". Available: ${Object.keys(COMMANDS).join(', ')}`)
      return
    }

    const result = await handler()
    core.setOutput('result', JSON.stringify(result))

    writeSummary(command, result)
  } catch (error) {
    core.setFailed(error.message)
  }
}

// -- Command handlers -------------------------------------------------------

async function runUpload() {
  const bucket = core.getInput('bucket', { required: true })
  const key = core.getInput('key', { required: true })
  const contentType = core.getInput('content-type') || 'application/octet-stream'

  let body
  const bodyFile = core.getInput('body-file')
  if (bodyFile) {
    body = readFileSync(bodyFile)
  } else {
    body = Buffer.from(core.getInput('body') || '')
  }

  const resp = await execute('PUT', `/${bucket}/${key}`, '', body)

  return {
    status: resp.status,
    bucket,
    key,
    size: body.length,
    contentType,
    etag: resp.headers.get('etag') || null,
  }
}

async function runDownload() {
  const bucket = core.getInput('bucket', { required: true })
  const key = core.getInput('key', { required: true })
  const outputFile = core.getInput('output-file')

  const resp = await execute('GET', `/${bucket}/${key}`, '', null)

  if (!resp.ok) {
    throw new Error(`Download failed: ${resp.status} ${resp.statusText}`)
  }

  const buffer = Buffer.from(await resp.arrayBuffer())

  if (outputFile) {
    writeFileSync(outputFile, buffer)
    return {
      status: resp.status,
      bucket,
      key,
      size: buffer.length,
      outputFile,
    }
  }

  // Return content as base64 for small files, or just metadata
  if (buffer.length < 1024 * 1024) {
    return {
      status: resp.status,
      bucket,
      key,
      size: buffer.length,
      content: buffer.toString('utf-8'),
      contentBase64: buffer.toString('base64'),
    }
  }

  return {
    status: resp.status,
    bucket,
    key,
    size: buffer.length,
    note: 'File too large for inline output. Use output-file input.',
  }
}

async function runDelete() {
  const bucket = core.getInput('bucket', { required: true })
  const key = core.getInput('key', { required: true })

  const resp = await execute('DELETE', `/${bucket}/${key}`, '', null)

  return { status: resp.status, bucket, key, deleted: resp.status === 204 }
}

async function runList() {
  const bucket = core.getInput('bucket', { required: true })
  const prefix = core.getInput('prefix') || ''
  const maxKeys = core.getInput('max-keys') || '1000'

  const listReq = JSON.parse(wasm.build_list_request(ENDPOINT, bucket, prefix, parseInt(maxKeys), ''))
  const resp = await execute('GET', listReq.path, listReq.query_string || '', null)
  const body = await resp.text()

  // Parse XML response for keys
  const keys =
    body.match(/<Key>[^<]+<\/Key>/g)?.map((k) => k.replace(/<\/?Key>/g, '')) || []
  const sizes =
    body.match(/<Size>[^<]+<\/Size>/g)?.map((s) => parseInt(s.replace(/<\/?Size>/g, ''))) || []
  const truncated = body.includes('<IsTruncated>true</IsTruncated>')

  const objects = keys.map((k, i) => ({ key: k, size: sizes[i] || 0 }))

  return { status: resp.status, bucket, prefix, objects, count: objects.length, truncated }
}

async function runListBuckets() {
  const resp = await execute('GET', '/', '', null)
  const body = await resp.text()

  const buckets =
    body.match(/<Name>[^<]+<\/Name>/g)?.map((b) => b.replace(/<\/?Name>/g, '')) || []

  return { status: resp.status, buckets, count: buckets.length }
}

async function runCreateBucket() {
  const bucket = core.getInput('bucket', { required: true })
  const resp = await execute('PUT', `/${bucket}`, '', null)

  return { status: resp.status, bucket, created: resp.ok }
}

async function runDeleteBucket() {
  const bucket = core.getInput('bucket', { required: true })
  const resp = await execute('DELETE', `/${bucket}`, '', null)

  return { status: resp.status, bucket, deleted: resp.status === 204 || resp.ok }
}

async function runHead() {
  const bucket = core.getInput('bucket', { required: true })
  const key = core.getInput('key') || ''

  const path = key ? `/${bucket}/${key}` : `/${bucket}`
  const resp = await execute('HEAD', path, '', null)

  const metadata = {}
  for (const [k, v] of resp.headers.entries()) {
    if (k.startsWith('x-amz-') || k === 'content-type' || k === 'content-length' || k === 'etag' || k === 'last-modified') {
      metadata[k] = v
    }
  }

  return { status: resp.status, bucket, key, exists: resp.ok, metadata }
}

async function runPresign() {
  const bucket = core.getInput('bucket', { required: true })
  const key = core.getInput('key', { required: true })
  const expires = parseInt(core.getInput('expires') || '3600')
  const method = core.getInput('method') || 'GET'

  const ts = timestamp()
  const url = wasm.presign_url(
    method,
    ENDPOINT,
    bucket,
    key,
    ACCESS_KEY,
    SECRET_KEY,
    REGION,
    ts,
    BigInt(expires),
  )

  return { url, method, bucket, key, expires, validUntil: new Date(Date.now() + expires * 1000).toISOString() }
}

async function runCopy() {
  const sourceBucket = core.getInput('source-bucket', { required: true })
  const sourceKey = core.getInput('source-key', { required: true })
  const bucket = core.getInput('bucket', { required: true })
  const key = core.getInput('key', { required: true })

  const resp = await execute('PUT', `/${bucket}/${key}`, '', null, {
    'x-amz-copy-source': `/${sourceBucket}/${sourceKey}`,
  })

  return {
    status: resp.status,
    source: `${sourceBucket}/${sourceKey}`,
    destination: `${bucket}/${key}`,
    copied: resp.ok,
  }
}

// -- Summary ----------------------------------------------------------------

function writeSummary(command, result) {
  const heading = `W3.cloud: ${command}`

  if (command === 'list-buckets') {
    core.summary
      .addHeading(heading, 3)
      .addRaw(`**${result.count}** buckets: ${result.buckets.join(', ')}\n`)
      .write()
    return
  }

  if (command === 'list') {
    core.summary
      .addHeading(heading, 3)
      .addRaw(`**${result.count}** objects in \`${result.bucket}\`${result.prefix ? ` (prefix: ${result.prefix})` : ''}\n`)
      .write()
    return
  }

  if (command === 'presign') {
    core.summary
      .addHeading(heading, 3)
      .addRaw(`**${result.method}** \`${result.bucket}/${result.key}\` — valid ${result.expires}s\n`)
      .addRaw(`URL: \`${result.url.slice(0, 80)}...\`\n`)
      .write()
    return
  }

  if (command === 'upload') {
    core.summary
      .addHeading(heading, 3)
      .addRaw(`Uploaded \`${result.key}\` to \`${result.bucket}\` (${result.size} bytes)\n`)
      .write()
    return
  }

  core.summary
    .addHeading(heading, 3)
    .addCodeBlock(JSON.stringify(result, null, 2), 'json')
    .write()
}

run()
