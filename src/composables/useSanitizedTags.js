import { computed, ref } from 'vue'
import rawData from '../data/tags.json'

function decodeHtmlEntities(str = '') {
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

function stripHtml(str = '') {
  return str.replace(/<[^>]*>/g, '').trim()
}

function parseAttributes(html = '') {
  const attrs = {}
  const regex = /([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g
  let match

  while ((match = regex.exec(html)) !== null) {
    attrs[match[1].toLowerCase()] = match[2]
  }

  return attrs
}

function detectType(name = '') {
  const lower = name.toLowerCase().trim()

  if (lower.startsWith('<img')) return 'image'
  if (lower.startsWith('<iframe')) return 'iframe'
  return 'text'
}

function parseTagName(name, id) {
  const type = detectType(name)

  if (type === 'image') {
    const attrs = parseAttributes(name)
    const src = attrs.src || ''
    const alt = decodeHtmlEntities(attrs.alt || 'Image')

    return {
      type,
      src,
      alt,
      displayTitle: alt || 'Image',
      summary: '',
      rawText: name
    }
  }

  if (type === 'iframe') {
    const attrs = parseAttributes(name)
    const src = attrs.src || ''
    const title = decodeHtmlEntities(attrs.title || 'Embedded Content')

    return {
      type,
      src,
      displayTitle: title || 'Embedded Content',
      summary: '',
      rawText: name
    }
  }

 

  const text = decodeHtmlEntities(name)

  return {
    type: 'text',
    displayTitle: text,
    summary: '',
    rawText: text
  }
}

function formatDate(isoString) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return isoString || ''

  return new Intl.DateTimeFormat('zh-Hant', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function normalizeTag(tag) {
  const parsed = parseTagName(tag.name, tag.id)

  return {
    ...tag,
    parsed,
    createdAtFormatted: formatDate(tag.createdAt),
    updatedAtFormatted: formatDate(tag.updatedAt)
  }
}

function createInitialTags() {
  const initialTags = Array.isArray(rawData.tags) ? rawData.tags : []
  return initialTags.map(normalizeTag)
}

const tagsState = ref(createInitialTags())

export function useSanitizedTags() {
  const parsedTags = computed(() => tagsState.value)

  const stats = computed(() => ({
    exportedAt: rawData.exportedAt,
    exportedAtFormatted: formatDate(rawData.exportedAt),
    totalTags: parsedTags.value.length,
    textCount: parsedTags.value.filter((item) => item.parsed.type === 'text').length,
    imageCount: parsedTags.value.filter((item) => item.parsed.type === 'image').length,
    iframeCount: parsedTags.value.filter((item) => item.parsed.type === 'iframe').length,
  }))

  function addTag(name) {
    const now = new Date().toISOString()
    const id = Date.now().toString()

    const newTag = normalizeTag({
      id,
      name,
      createdAt: now,
      updatedAt: now
    })

    tagsState.value = [newTag, ...tagsState.value]
  }

  function editTag(id, newName) {
    const now = new Date().toISOString()

    tagsState.value = tagsState.value.map((tag) => {
      if (tag.id !== id) return tag

      return normalizeTag({
        ...tag,
        name: newName,
        updatedAt: now
      })
    })
  }

  function deleteTag(id) {
    tagsState.value = tagsState.value.filter((tag) => tag.id !== id)
  }

  function importTagsFromFileContent(jsonText) {
    const parsed = JSON.parse(jsonText)

    if (!parsed.tags || !Array.isArray(parsed.tags)) {
      throw new Error('Invalid JSON format: "tags" array not found.')
    }

    const existingMap = new Map(tagsState.value.map((tag) => [tag.id, tag]))

    for (const item of parsed.tags) {
      const normalized = normalizeTag(item)
      existingMap.set(normalized.id, normalized)
    }

    tagsState.value = Array.from(existingMap.values()).sort((a, b) => {
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    })
  }

  function exportTagsToFile() {
    const payload = {
      exportedAt: new Date().toISOString(),
      totalTags: tagsState.value.length,
      tags: tagsState.value.map((tag) => ({
        id: tag.id,
        name: tag.name,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt
      }))
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tags-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    rawData,
    parsedTags,
    stats,
    addTag,
    editTag,
    deleteTag,
    importTagsFromFileContent,
    exportTagsToFile
  }
}