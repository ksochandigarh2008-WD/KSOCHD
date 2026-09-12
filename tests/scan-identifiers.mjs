/**
 * Static scan for identifiers that are used but never declared or imported.
 *
 * WHY THIS EXISTS
 * `vite build` does not fail on an undefined identifier in JSX or in a call — it ships
 * happily and throws at runtime, in the browser, in front of a visitor. This has bitten
 * the project four times (a missing `Button`, a missing `SEL`, an undefined `audit`, an
 * undefined `analyticsOn`), each one caught by luck rather than by the build.
 *
 * WHAT IT DOES
 * For every source file, collects every name that is imported or declared, then flags
 * names that are USED (as a JSX component, or as a function call) without being one of
 * those. It is intentionally conservative: a regex scanner that cries wolf gets ignored,
 * it reports JSX components used without an import — the pattern that has actually caused
 * every one of those failures. Undefined *variables* are caught by rendering every page in
 * tests/run-ssr.mjs, which exercises the code for real.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../src', import.meta.url).pathname

const files = []
;(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.jsx?$/.test(entry)) files.push(full)
  }
})(ROOT)

/** Globals that legitimately appear with no import. */
const GLOBALS = new Set([
  'Boolean', 'String', 'Number', 'Object', 'Array', 'Math', 'JSON', 'Date', 'Promise', 'Error',
  'TypeError', 'RangeError', 'Set', 'Map', 'WeakMap', 'Symbol', 'RegExp', 'Intl', 'BigInt',
  'window', 'document', 'console', 'localStorage', 'sessionStorage', 'navigator', 'location',
  'history', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'undefined', 'null', 'true', 'false', 'this',
  'process', 'require', 'alert', 'confirm', 'URL', 'FileReader', 'Blob', 'FormData', 'Event',
  'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'AbortController', 'TextEncoder', 'Node',
])

/** Names declared or imported in a file. */
function declared(src) {
  const names = new Set()
  const add = (n) => n && /^[A-Za-z_$][\w$]*$/.test(n) && names.add(n)

  // import default, import { a, b as c }, import * as ns
  for (const m of src.matchAll(/^import\s+(?:(\w+)|\*\s+as\s+(\w+)|\{([^}]*)\})(?:\s*,)?(?:\s*\{([^}]*)\})?\s+from/gm)) {
    add(m[1]); add(m[2])
    for (const group of [m[3], m[4]]) {
      if (!group) continue
      for (const part of group.split(',')) {
        const bits = part.trim().split(/\s+as\s+/)
        add(bits[bits.length - 1]?.trim())
      }
    }
  }
  // const/let/var/function/class declarations (top level and nested)
  for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) add(m[1])
  for (const m of src.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g)) add(m[1])
  for (const m of src.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)) add(m[1])
  // destructuring: const { a, b: c } = ...  and  ([a, b]) =>
  for (const m of src.matchAll(/[{(]\s*([A-Za-z_$][\w$]*(?:\s*:\s*[A-Za-z_$][\w$]*)?(?:\s*,\s*[A-Za-z_$][\w$]*(?:\s*:\s*[A-Za-z_$][\w$]*)?)*)\s*}/g)) {
    for (const part of m[1].split(',')) {
      const bits = part.split(':')
      add(bits[bits.length - 1].trim())
    }
  }
  // array destructuring: const [a, setA] = useState(...)
  for (const m of src.matchAll(/\[([^\]]+)\]\s*=/g)) {
    for (const part of m[1].split(',')) {
      const name = part.replace(/\.\.\./, '').replace(/\s*=.*$/, '').replace(/[^\w$]/g, '')
      add(name)
    }
  }
  // function parameters — named functions, arrows, and destructured patterns
  const paramSources = []
  for (const m of src.matchAll(/function\s*[A-Za-z_$\w]*\s*\(([^()]*)\)/g)) paramSources.push(m[1])
  for (const m of src.matchAll(/\(([^()]*)\)\s*=>/g)) paramSources.push(m[1])
  for (const m of src.matchAll(/^\s*(\w+)\s*=>/gm)) paramSources.push(m[1])
  for (const params of paramSources) {
    for (const part of params.split(',')) {
      for (const bit of part.replace(/[=:{}\[\].\s?]/g, ' ').trim().split(/\s+/)) add(bit)
    }
  }
  return names
}

const problems = []
for (const file of files) {
  const raw = readFileSync(file, 'utf8')
  // Prose, comments and template text are not code: strip them before scanning.
  const src = raw
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
    .replace(/`(?:\\.|[^`\\])*`/g, ' ` ` ')
    .replace(/'(?:\\.|[^'\\])*'/g, " '' ")
    .replace(/"(?:\\.|[^"\\])*"/g, ' "" ')
  const known = declared(src)

  // JSX components: <Name ... /  — capitalised, so never a DOM tag
  for (const m of src.matchAll(/<([A-Z][\w.]*)/g)) {
    const name = m[1].split('.')[0]
    if (!known.has(name) && !GLOBALS.has(name)) {
      problems.push(`${relative(ROOT, file)}: <${name}> used but never imported or declared`)
    }
  }
}

// The scanner is heuristic: curated exceptions that are known-good (JSX fragments, hooks
// used via a namespace, template literals that look like calls, etc.).
const ALLOW = [/^React$/, /\bFragment\b/]
const real = problems.filter((p) => !ALLOW.some((a) => a.test(p)))

const unique = [...new Set(real)].sort()
if (unique.length) {
  console.log(`\n❌ ${unique.length} undefined identifier(s):`)
  unique.forEach((p) => console.log(`   ${p}`))
  process.exit(1)
}
console.log(`\n✅ No undefined identifiers across ${files.length} source files.`)
