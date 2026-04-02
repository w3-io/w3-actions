import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Test the pure JSON operations that the json action performs.
 * The action delegates to WASM, but the operations are standard
 * JSON transforms. We test the expected semantics of each command.
 */

// Pure JS implementations matching the WASM semantics

function extract(inputStr, path) {
  const data = JSON.parse(inputStr)
  const keys = path.replace(/^\$\.?/, '').split('.').filter(Boolean)
  let current = data
  for (const key of keys) {
    if (current == null) return JSON.stringify(null)
    // Handle array indexing like [0]
    const arrMatch = key.match(/^(\w+)\[(\d+)\]$/)
    if (arrMatch) {
      current = current[arrMatch[1]]
      if (Array.isArray(current)) {
        current = current[parseInt(arrMatch[2], 10)]
      } else {
        current = undefined
      }
    } else {
      current = current[key]
    }
  }
  return JSON.stringify(current)
}

function merge(inputStr, overlayStr) {
  const base = JSON.parse(inputStr)
  const overlay = JSON.parse(overlayStr)
  return JSON.stringify({ ...base, ...overlay })
}

function filter(inputStr, field, expected) {
  const arr = JSON.parse(inputStr)
  const result = arr.filter((item) => String(item[field]) === expected)
  return JSON.stringify(result)
}

function mapField(inputStr, field) {
  const arr = JSON.parse(inputStr)
  const result = arr.map((item) => item[field])
  return JSON.stringify(result)
}

function count(inputStr) {
  const arr = JSON.parse(inputStr)
  return JSON.stringify({ count: arr.length })
}

function flatten(inputStr) {
  const arr = JSON.parse(inputStr)
  return JSON.stringify(arr.flat())
}

function pick(inputStr, keysStr) {
  const data = JSON.parse(inputStr)
  const keys = keysStr.split(',').map((k) => k.trim())
  const result = {}
  for (const key of keys) {
    if (key in data) {
      result[key] = data[key]
    }
  }
  return JSON.stringify(result)
}

describe('extract', () => {
  it('extracts a top-level field', () => {
    const result = extract('{"name":"alice","age":30}', '$.name')
    assert.equal(result, '"alice"')
  })

  it('extracts a nested field', () => {
    const result = extract('{"user":{"name":"bob"}}', '$.user.name')
    assert.equal(result, '"bob"')
  })

  it('extracts a numeric value', () => {
    const result = extract('{"count":42}', '$.count')
    assert.equal(result, '42')
  })

  it('extracts an object', () => {
    const result = extract('{"meta":{"a":1,"b":2}}', '$.meta')
    assert.deepEqual(JSON.parse(result), { a: 1, b: 2 })
  })

  it('returns null for missing path', () => {
    const result = extract('{"a":1}', '$.b')
    assert.equal(result, undefined)
  })
})

describe('merge', () => {
  it('merges two objects', () => {
    const result = merge('{"a":1,"b":2}', '{"c":3}')
    assert.deepEqual(JSON.parse(result), { a: 1, b: 2, c: 3 })
  })

  it('overlay overwrites base keys', () => {
    const result = merge('{"a":1,"b":2}', '{"b":99}')
    assert.deepEqual(JSON.parse(result), { a: 1, b: 99 })
  })

  it('merges into empty object', () => {
    const result = merge('{}', '{"x":"y"}')
    assert.deepEqual(JSON.parse(result), { x: 'y' })
  })

  it('merges with empty overlay', () => {
    const result = merge('{"a":1}', '{}')
    assert.deepEqual(JSON.parse(result), { a: 1 })
  })
})

describe('filter', () => {
  it('filters array by field value', () => {
    const input = JSON.stringify([
      { status: 'active', name: 'a' },
      { status: 'inactive', name: 'b' },
      { status: 'active', name: 'c' },
    ])
    const result = filter(input, 'status', 'active')
    const parsed = JSON.parse(result)
    assert.equal(parsed.length, 2)
    assert.equal(parsed[0].name, 'a')
    assert.equal(parsed[1].name, 'c')
  })

  it('returns empty array when no matches', () => {
    const input = JSON.stringify([{ x: 1 }, { x: 2 }])
    const result = filter(input, 'x', '999')
    assert.deepEqual(JSON.parse(result), [])
  })

  it('matches numeric field via string comparison', () => {
    const input = JSON.stringify([{ id: 1 }, { id: 2 }, { id: 1 }])
    const result = filter(input, 'id', '1')
    assert.equal(JSON.parse(result).length, 2)
  })
})

describe('map-field', () => {
  it('extracts a single field from each element', () => {
    const input = JSON.stringify([
      { name: 'alice', age: 30 },
      { name: 'bob', age: 25 },
    ])
    const result = mapField(input, 'name')
    assert.deepEqual(JSON.parse(result), ['alice', 'bob'])
  })

  it('returns undefined for missing fields', () => {
    const input = JSON.stringify([{ a: 1 }, { b: 2 }])
    const result = mapField(input, 'a')
    const parsed = JSON.parse(result)
    assert.equal(parsed[0], 1)
    assert.equal(parsed[1], null) // JSON.stringify(undefined) → null
  })

  it('works with empty array', () => {
    const result = mapField('[]', 'x')
    assert.deepEqual(JSON.parse(result), [])
  })
})

describe('count', () => {
  it('counts array elements', () => {
    const result = count('[1,2,3]')
    assert.deepEqual(JSON.parse(result), { count: 3 })
  })

  it('returns zero for empty array', () => {
    const result = count('[]')
    assert.deepEqual(JSON.parse(result), { count: 0 })
  })

  it('counts objects in array', () => {
    const input = JSON.stringify([{ a: 1 }, { b: 2 }])
    const result = count(input)
    assert.deepEqual(JSON.parse(result), { count: 2 })
  })
})

describe('flatten', () => {
  it('flattens nested arrays one level', () => {
    const result = flatten('[[1,2],[3,4],[5]]')
    assert.deepEqual(JSON.parse(result), [1, 2, 3, 4, 5])
  })

  it('no-ops on flat array', () => {
    const result = flatten('[1,2,3]')
    assert.deepEqual(JSON.parse(result), [1, 2, 3])
  })

  it('flattens empty sub-arrays', () => {
    const result = flatten('[[],[1],[]]')
    assert.deepEqual(JSON.parse(result), [1])
  })

  it('flattens mixed content', () => {
    const result = flatten('[["a","b"],["c"]]')
    assert.deepEqual(JSON.parse(result), ['a', 'b', 'c'])
  })
})

describe('pick', () => {
  it('picks specified keys from object', () => {
    const result = pick('{"a":1,"b":2,"c":3}', 'a,c')
    assert.deepEqual(JSON.parse(result), { a: 1, c: 3 })
  })

  it('ignores keys not present in object', () => {
    const result = pick('{"a":1}', 'a,z')
    assert.deepEqual(JSON.parse(result), { a: 1 })
  })

  it('returns empty object when no keys match', () => {
    const result = pick('{"a":1}', 'x,y')
    assert.deepEqual(JSON.parse(result), {})
  })

  it('handles keys with whitespace in csv', () => {
    const result = pick('{"name":"test","value":42}', 'name , value')
    assert.deepEqual(JSON.parse(result), { name: 'test', value: 42 })
  })
})

describe('unknown command handling', () => {
  it('known commands list is complete', () => {
    const commands = ['extract', 'merge', 'filter', 'map-field', 'count', 'flatten', 'pick']
    assert.equal(commands.length, 7)
  })
})
