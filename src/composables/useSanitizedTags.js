import { computed, ref } from 'vue'
import rawData from '../data/tags.json'

function decodeHtmlEntities(str = '') {
  if (typeof document === 'undefined') return str
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

function stripHtml(str = '') {
  return String(str).replace(/<[^>]*>/g, '').trim()
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
  const lower = String(name).toLowerCase().trim()

  if (lower.startsWith('<img')) return 'image'
  if (lower.startsWith('<iframe')) return 'iframe'
  if (lower.startsWith('<video')) return 'video'
  return 'text'
}

function parseTagName(name = '') {
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

  if (type === 'video') {
    const attrs = parseAttributes(name)
    const src = attrs.src || ''
    const title = decodeHtmlEntities(attrs.title || 'Video')

    return {
      type,
      src,
      displayTitle: title || 'Video',
      summary: '',
      rawText: name
    }
  }

  const text = decodeHtmlEntities(stripHtml(name))

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
  const parsed = parseTagName(tag?.name ?? '')

  return {
    ...tag,
    parsed,
    hidden: Boolean(tag?.hidden),
    struck: Boolean(tag?.struck),
    createdAtFormatted: formatDate(tag?.createdAt),
    updatedAtFormatted: formatDate(tag?.updatedAt)
  }
}

function createInitialTags() {
  const initialTags = Array.isArray(rawData.tags) ? rawData.tags : []
  return initialTags.map(normalizeTag)
}

const tagsState = ref(createInitialTags())

function sortByUpdatedAtDesc(a, b) {
  return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
}

function mergeAndSortTags(newTags) {
  const existingMap = new Map(tagsState.value.map((tag) => [tag.id, tag]))

  for (const item of newTags) {
    const normalized = normalizeTag(item)
    existingMap.set(normalized.id, normalized)
  }

  tagsState.value = Array.from(existingMap.values()).sort(sortByUpdatedAtDesc)
}

function parseImportTextInWorker(text) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/tagImport.worker.js', import.meta.url), {
      type: 'module'
    })

    worker.onmessage = (event) => {
      const data = event.data || {}
      worker.terminate()

      if (data.ok) {
        resolve(data.tags || [])
      } else {
        reject(new Error(data.error || 'Import failed'))
      }
    }

    worker.onerror = (error) => {
      worker.terminate()
      reject(error)
    }

    worker.postMessage({ text })
  })
}

export function useSanitizedTags() {
  const parsedTags = computed(() => tagsState.value)

  const stats = computed(() => {
    let textCount = 0
    let imageCount = 0
    let iframeCount = 0
    let videoCount = 0

    for (const item of tagsState.value) {
      const type = item?.parsed?.type
      if (type === 'text') textCount += 1
      else if (type === 'image') imageCount += 1
      else if (type === 'iframe') iframeCount += 1
      else if (type === 'video') videoCount += 1
    }

    return {
      exportedAt: rawData.exportedAt,
      exportedAtFormatted: formatDate(rawData.exportedAt),
      totalTags: tagsState.value.length,
      textCount,
      imageCount,
      iframeCount,
      videoCount
    }
  })

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

  function importTagsFromBatch(batch) {
    if (!Array.isArray(batch)) {
      throw new Error('importTagsFromBatch expects an array')
    }

    mergeAndSortTags(batch)
  }

  async function importTagsFromFileContentWithWorker(jsonText) {
    const tags = await parseImportTextInWorker(jsonText)
    mergeAndSortTags(tags)
  }

  function importTagsFromFileContent(jsonText) {
    const parsed = JSON.parse(jsonText)

    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.tags)
        ? parsed.tags
        : null

    if (!list) {
      throw new Error('Invalid JSON format: expected an array or an object with a "tags" array.')
    }

    mergeAndSortTags(list)
  }

  function exportTagsToFile() {
    const payload = {
      exportedAt: new Date().toISOString(),
      totalTags: tagsState.value.length,
      tags: tagsState.value.map((tag) => ({
        id: tag.id,
        name: tag.name,
        hidden: Boolean(tag.hidden),
        struck: Boolean(tag.struck),
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
    importTagsFromBatch,
    importTagsFromFileContent,
    importTagsFromFileContentWithWorker,
    exportTagsToFile
  }
}