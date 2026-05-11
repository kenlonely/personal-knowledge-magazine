import { escapeRegExp, stripHtml } from './tagUtils'

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}


export function parseSearchQuery(query = '') {
  const raw = String(query || '').trim()

  if (!raw) {
    return {
      raw,
      filters: {},
      ast: null,
      termsForHighlight: [],
      groups: [],
    }
  }

  const { textQuery, filters } = extractFilters(raw)
  const tokens = tokenizeBooleanQuery(textQuery)

  let ast = null
  try {
    ast = parseBooleanTokens(tokens)
  } catch (error) {
    // fallback: if syntax is broken, treat whole textQuery as loose AND terms
    const looseTerms = tokenizeLooseTerms(textQuery)
    ast = buildImplicitAndAst(looseTerms)
  }

  const termsForHighlight = extractTermsFromAst(ast)

  return {
    raw,
    filters,
    ast,
    termsForHighlight: [...new Set(termsForHighlight)],
    // keep compatibility with older structure if your UI still reads groups
    groups: ast ? [{ terms: termsForHighlight, filters }] : [],
  }
}

/**
 * Extract field filters from raw query while preserving quoted text.
 */
function extractFilters(raw = '') {
  const tokens = tokenizeAdvanced(raw)
  const filters = {}
  const textParts = []

  for (const token of tokens) {
    const lower = String(token).toLowerCase()

    if (lower.startsWith('id:')) {
      filters.id = token.slice(3).trim()
      continue
    }
    if (lower.startsWith('type:')) {
      filters.type = token.slice(5).trim().toLowerCase()
      continue
    }
    if (lower.startsWith('hidden:')) {
      filters.hidden = normalizeBoolToken(token.slice(7))
      continue
    }
    if (lower.startsWith('strike:')) {
      filters.struck = normalizeBoolToken(token.slice(7))
      continue
    }

    textParts.push(token)
  }

  return {
    filters,
    textQuery: textParts.join(' ').trim(),
  }
}


export function tokenizeAdvanced(input = '') {
  const result = []
  const regex = /"([^"]+)"|'([^']+)'|(\S+)/g
  let match

  while ((match = regex.exec(input)) !== null) {
    result.push(match[1] || match[2] || match[3])
  }

  return result
}

function normalizeBoolToken(v = '') {
  const value = String(v).toLowerCase().trim()
  if (['1', 'true', 'yes', 'y'].includes(value)) return true
  if (['0', 'false', 'no', 'n'].includes(value)) return false
  return null
}

export function tokenizeBooleanQuery(input = '') {
  const s = String(input || '').trim()
  const tokens = []
  let i = 0

  const pushTerm = (value) => {
    const v = String(value || '').trim()
    if (v) tokens.push({ type: 'term', value: v })
  }

  while (i < s.length) {
    const ch = s[i]

    if (/\s/.test(ch)) {
      i++
      continue
    }

    if (ch === '|' || ch === ',' || ch === '(' || ch === ')') {
      tokens.push({ type: 'op', value: ch })
      i++
      continue
    }

    if (ch === '"' || ch === "'") {
      const quote = ch
      i++
      let value = ''
      while (i < s.length && s[i] !== quote) {
        value += s[i]
        i++
      }
      if (i < s.length && s[i] === quote) i++
      pushTerm(value)
      continue
    }

    // normal word, may include leading "-" like -apple or --apple
    let value = ''
    while (i < s.length && !/\s/.test(s[i]) && !['|', ',', '(', ')'].includes(s[i])) {
      value += s[i]
      i++
    }
    pushTerm(value)
  }

  return tokens
}

/**
 * Loose tokenizer used for fallback.
 */
function tokenizeLooseTerms(input = '') {
  return tokenizeAdvanced(input).filter(Boolean)
}

function buildImplicitAndAst(terms = []) {
  const clean = terms.map((t) => String(t).trim()).filter(Boolean)
  if (!clean.length) return null

  let ast = termToNode(clean[0])
  for (let i = 1; i < clean.length; i++) {
    ast = {
      type: 'AND',
      left: ast,
      right: termToNode(clean[i]),
    }
  }
  return ast
}

function termToNode(raw) {
  let text = String(raw || '').trim()
  if (!text) return null

  let notCount = 0
  while (text.startsWith('-') && text.length > 1) {
    notCount++
    text = text.slice(1).trim()
  }

  let node = { type: 'TERM', value: text }
  for (let i = 0; i < notCount; i++) {
    node = { type: 'NOT', child: node }
  }
  return node
}

/**
 * Recursive descent parser
 *
 * precedence:
 * 1. unary NOT
 * 2. AND (explicit "," and implicit whitespace adjacency)
 * 3. OR  ("|")
 */
export function parseBooleanTokens(tokens = []) {
  let pos = 0

  const peek = () => tokens[pos]
  const consume = () => tokens[pos++]

  const matchOp = (op) => {
    const t = peek()
    if (t && t.type === 'op' && t.value === op) {
      pos++
      return true
    }
    return false
  }

  const isUnaryStart = (t) => {
    if (!t) return false
    if (t.type === 'op' && t.value === '(') return true
    if (t.type === 'term') return true
    return false
  }

  const parsePrimary = () => {
    const t = peek()
    if (!t) return null

    if (t.type === 'op' && t.value === '(') {
      consume()
      const node = parseOr()
      if (!matchOp(')')) {
        throw new Error('Missing closing parenthesis )')
      }
      return node
    }

    if (t.type === 'term') {
      consume()
      return termToNode(t.value)
    }

    return null
  }

  const parseUnary = () => {
    const t = peek()
    if (!t) return null

    // allow standalone "-" term if tokenizer ever emits it
    if (t.type === 'term' && t.value === '-') {
      consume()
      const child = parseUnary()
      if (!child) return null
      return { type: 'NOT', child }
    }

    return parsePrimary()
  }

  const parseAnd = () => {
    let left = parseUnary()
    if (!left) return null

    while (true) {
      // explicit AND with comma
      if (matchOp(',')) {
        const right = parseUnary()
        if (!right) break
        left = { type: 'AND', left, right }
        continue
      }

      // implicit AND by adjacency:
      // e.g. apple watch => apple AND watch
      const t = peek()
      if (isUnaryStart(t)) {
        const right = parseUnary()
        if (!right) break
        left = { type: 'AND', left, right }
        continue
      }

      break
    }

    return left
  }

  const parseOr = () => {
    let left = parseAnd()
    if (!left) return null

    while (matchOp('|')) {
      const right = parseAnd()
      if (!right) break
      left = { type: 'OR', left, right }
    }

    return left
  }

  const ast = parseOr()

  if (pos < tokens.length) {
    const rest = tokens.slice(pos).map((t) => t.value).join(' ')
    throw new Error(`Unexpected tokens near: ${rest}`)
  }

  return ast
}

export function tagToSearchText(tag) {
  return [
    tag.id,
    tag.name,
    tag.parsed?.displayTitle || '',
    tag.parsed?.type || '',
    stripHtml(tag.name || ''),
  ]
    .join('\n')
    .toLowerCase()
}

export function matchTagByParsedQuery(tag, parsed) {
  if (!parsed) return true
  if (!matchFilters(tag, parsed.filters)) return false
  if (!parsed.ast) return true

  const haystack = tagToSearchText(tag)
  return evalAst(parsed.ast, haystack)
}

function matchFilters(tag, filters = {}) {
  if (filters.id && !String(tag.id).includes(String(filters.id))) return false
  if (filters.type && String(tag.parsed?.type || '').toLowerCase() !== filters.type) return false
  if (typeof filters.hidden === 'boolean' && !!tag.hidden !== filters.hidden) return false
  if (typeof filters.struck === 'boolean' && !!tag.struck !== filters.struck) return false
  return true
}

/** escaped literal regex */
export function buildRegex(term) {
  const escaped = escapeRegExp(String(term || ''))
  return new RegExp(escaped, 'i')
}

export function evalAst(ast, tagText = '') {
  if (!ast) return true
  const haystack = String(tagText || '')

  switch (ast.type) {
    case 'TERM':
      return buildRegex(ast.value).test(haystack)
    case 'NOT':
      return !evalAst(ast.child, haystack)
    case 'AND':
      return evalAst(ast.left, haystack) && evalAst(ast.right, haystack)
    case 'OR':
      return evalAst(ast.left, haystack) || evalAst(ast.right, haystack)
    default:
      return true
  }
}

function extractTermsFromAst(ast) {
  const terms = []

  const walk = (node) => {
    if (!node) return
    if (node.type === 'TERM' && node.value) {
      const clean = String(node.value).trim()
      if (clean) terms.push(clean)
      return
    }
    if (node.type === 'NOT') {
      walk(node.child)
      return
    }
    if (node.type === 'AND' || node.type === 'OR') {
      walk(node.left)
      walk(node.right)
    }
  }

  walk(ast)
  return terms
}

export function highlightHtml(text = '', terms = []) {
  const raw = String(text ?? '')
  const termList = [...new Set((terms || []).filter(Boolean).map(String))]
    .map((s) => s.trim())
    .filter(Boolean)

  if (!termList.length) return escapeHtml(raw).replace(/\n/g, '<br>')

  const sortedTerms = termList.sort((a, b) => b.length - a.length)
  const regex = new RegExp(`(${sortedTerms.map(escapeRegExp).join('|')})`, 'gi')

  return escapeHtml(raw)
    .replace(regex, '<mark class="hl">$1</mark>')
    .replace(/\n/g, '<br>')
}

export function getMatchedSnippet(text = '', terms = [], radius = 140) {
  const raw = String(text || '')
  const clean = raw.replace(/\s+/g, ' ').trim()
  if (!clean) return ''

  const termList = [...new Set((terms || []).filter(Boolean).map((t) => String(t).toLowerCase()))]
  if (!termList.length) return clean.slice(0, radius * 2)

  let bestIndex = -1
  let matchedTerm = ''

  for (const term of termList) {
    const idx = clean.toLowerCase().indexOf(term)
    if (idx >= 0 && (bestIndex === -1 || idx < bestIndex)) {
      bestIndex = idx
      matchedTerm = term
    }
  }

  if (bestIndex === -1) return clean.slice(0, radius * 2)

  const start = Math.max(0, bestIndex - radius)
  const end = Math.min(clean.length, bestIndex + matchedTerm.length + radius)
  let snippet = clean.slice(start, end)

  if (start > 0) snippet = `...${snippet}`
  if (end < clean.length) snippet = `${snippet}...`
  return snippet
}

export function scoreTag(tag, parsed) {
  if (!parsed) return 0

  const text = tagToSearchText(tag)
  let score = 0

  // filter matched gets a base score
  if (matchFilters(tag, parsed.filters)) score += 10

  const terms = parsed.termsForHighlight || []
  for (const term of terms) {
    const lower = String(term).toLowerCase()
    const first = text.indexOf(lower)
    if (first >= 0) {
      score += 20
      score += Math.max(0, 1000 - first) / 100
    }
  }

  // small boosts
  if (parsed.ast && evalAst(parsed.ast, text)) score += 30
  if (tag.parsed?.type === 'text') score += 2
  if (!tag.hidden) score += 1

  return score
}