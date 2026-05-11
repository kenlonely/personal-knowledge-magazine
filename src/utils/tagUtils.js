export function generateTagId() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const millis = String(now.getMilliseconds()).padStart(3, '0')
  return `${year}${month}${day}${hours}${minutes}${seconds}${millis}`
}

export function decodeHtmlEntities(str = '') {
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

export function stripHtml(str = '') {
  return String(str).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function parseAttributes(html = '') {
  const attrs = {}
  const regex = /([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g
  let match
  while ((match = regex.exec(html)) !== null) {
    attrs[match[1].toLowerCase()] = match[2]
  }
  return attrs
}

export function detectType(name = '') {
  const lower = String(name).toLowerCase().trim()
  if (lower.startsWith('<img')) return 'image'
  if (lower.startsWith('<iframe')) return 'iframe'
  if (lower.startsWith('<video')) return 'video'
  return 'text'
}

export function isImageUrl(url = '') {
  return /\.(jpg|jpeg|png|gif|webp|avif)([?#].*)?$/i.test(url)
}

export function isVideoUrl(url = '') {
  return /\.(mp4|webm|ogg|mov)([?#].*)?$/i.test(url)
}

export function normalizeInputToTagContent(input = '') {
  const value = String(input).trim()
  if (!value) return ''

  if (/^http/i.test(value)) {
    if (isImageUrl(value)) {
      return `<img src="${value}" alt="Image" loading="lazy" decoding="async">`
    }
    if (isVideoUrl(value)) {
      return `<video controls preload="metadata"><source src="${value}" type="video/mp4"></video>`
    }
  }

  return value
}

export function formatParagraphs(str = '') {
  if (!str) return ''

  const quotes = []
  let result = String(str).replace(
    /([“”"‘’「『])(.*?)([”"’」』])/gs,
    (match, open, inner, close) => {
      const merged = inner.replace(/\s*\n\s*/g, ' ').trim()
      const key = `__QUOTE${quotes.length}__`
      quotes.push(`${open}${merged}${close}`)
      return key
    }
  )

  result = result
    .replace(/[ \t\u00A0]+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim()

  result = result
    .replace(/([。！？!?])([」』”"]?)/g, '$1$2\n')
    .replace(/([^A-Z\d])\.(\s+|$)/g, '$1.\n')
    .replace(/([！？!?。\.])\n(?=[」』"')])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/(\d)\.\s*[\n\s]+\s*(\d)/g, '$1.$2')
    .replace(/\(\s*\n\s*/g, '(')
    .replace(/\s*\n\s*\)/g, ')')
    .replace(/\n(?=」|』|”|")/g, '')
    .replace(/\n{3,}/g, '\n\n')

  quotes.forEach((quote, i) => {
    result = result.replace(`__QUOTE${i}__`, quote)
  })

  return result.replace(/[ \t]+\n/g, '\n').trim()
}

export function removeDuplicateTags(tags = []) {
  const seen = new Set()
  const unique = []

  for (const tag of tags) {
    const raw = String(tag.name || '')
    if (/<(img|iframe|video)\b/i.test(raw)) {
      unique.push(tag)
      continue
    }

    const processed = raw.length > 3000 ? raw : formatParagraphs(raw)
    const key = processed.toLowerCase()

    if (!seen.has(key)) {
      seen.add(key)
      unique.push({
        ...tag,
        name: processed,
      })
    }
  }

  return unique
}

export function escapeRegExp(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}