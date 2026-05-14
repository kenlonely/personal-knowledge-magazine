import { escapeRegExp } from './tagUtils'

function normalizeText(value = '') {
  return String(value ?? '')
}

function normalizeColor(value = '#fff2a8') {
  const color = String(value || '').trim()
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#fff2a8'
}

export function tokenizeSearchQuery(query = '') {
  return normalizeText(query)
    .trim()
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function getQueryTerms(query = '', { unique = true, lower = false } = {}) {
  let terms = tokenizeSearchQuery(query)

  if (lower) {
    terms = terms.map((item) => item.toLowerCase())
  }

  return unique ? [...new Set(terms)] : terms
}

export function escapeHtml(str = '') {
  return normalizeText(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildHighlightRegex(terms = []) {
  const cleanTerms = [...new Set(
    (terms || [])
      .map((item) => normalizeText(item).trim())
      .filter(Boolean)
  )].sort((a, b) => b.length - a.length)

  if (!cleanTerms.length) return null

  return new RegExp(`(${cleanTerms.map(escapeRegExp).join('|')})`, 'gi')
}

export function highlightHtml(text = '', query = '') {
  const raw = normalizeText(text)
  const terms = getQueryTerms(query)
  const escaped = escapeHtml(raw)
  const regex = buildHighlightRegex(terms)

  if (!regex) {
    return escaped.replace(/\n/g, '<br>')
  }

  return escaped
    .replace(regex, '<mark class="hl">$1</mark>')
    .replace(/\n/g, '<br>')
}

export function highlightHtmlWithItems(text = '', items = []) {
  const raw = normalizeText(text)
  const escaped = escapeHtml(raw)

  const cleanItems = (Array.isArray(items) ? items : [])
    .map((item) => {
      if (typeof item === 'string') {
        const text = normalizeText(item).trim()
        return text ? { text, color: '#fff2a8' } : null
      }

      const text = normalizeText(item?.text || item?.word || '').trim()
      if (!text) return null

      return {
        text,
        color: normalizeColor(item?.color || '#fff2a8'),
      }
    })
    .filter(Boolean)

  if (!cleanItems.length) {
    return escaped.replace(/\n/g, '<br>')
  }

  let result = escaped

  for (const item of [...cleanItems].sort((a, b) => b.text.length - a.text.length)) {
    const regex = buildHighlightRegex([item.text])
    if (!regex) continue

    result = result.replace(
      regex,
      `<mark class="hl" style="background-color: ${item.color}">$1</mark>`
    )
  }

  return result.replace(/\n/g, '<br>')
}

export function includesQuery(text = '', query = '', { match = 'every' } = {}) {
  const raw = normalizeText(text).toLowerCase()
  const terms = getQueryTerms(query, { lower: true })

  if (!terms.length) return true

  if (match === 'some') {
    return terms.some((term) => raw.includes(term))
  }

  return terms.every((term) => raw.includes(term))
}

export function getMatchedTerms(text = '', query = '') {
  const raw = normalizeText(text).toLowerCase()
  const terms = getQueryTerms(query, { lower: true })
  return terms.filter((term) => raw.includes(term))
}