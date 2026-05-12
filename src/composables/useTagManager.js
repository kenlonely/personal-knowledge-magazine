import { computed, ref, watch } from 'vue'
import rawData from '../data/tags.json'
import {
  decodeHtmlEntities,
  detectType,
  formatParagraphs,
  generateTagId,
  normalizeInputToTagContent,
  parseAttributes,
  removeDuplicateTags,
} from '../utils/tagUtils'

const STORAGE_KEY = 'my_tags_state_v21'
const VIEW_KEY = 'my_tags_view_mode_v21'
const PAGE_SIZE_KEY = 'my_tags_page_size_v21'
const IMG_SIZE_KEY = 'my_tags_img_size_v21'
const BODY_WIDTH_KEY = 'my_tags_body_width_v21'

function formatDate(isoString) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return isoString || ''

  return new Intl.DateTimeFormat('zh-Hant', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
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
      rawText: name,
    }
  }

  if (type === 'iframe') {
    const attrs = parseAttributes(name)
    return {
      type,
      src: attrs.src || '',
      displayTitle: decodeHtmlEntities(attrs.title || 'Embedded Content'),
      rawText: name,
    }
  }

  if (type === 'video') {
    const sourceMatch = String(name).match(/<source[^>]*src="([^"]+)"/i)
    const src = sourceMatch?.[1] || parseAttributes(name).src || ''
    return {
      type,
      src,
      displayTitle: 'Video',
      rawText: name,
    }
  }

  const text = decodeHtmlEntities(name)

  return {
    type: 'text',
    displayTitle: text,
    rawText: text,
  }
}

function normalizeTag(tag) {
  const now = new Date().toISOString()

  const normalized = {
    id: tag?.id || generateTagId(),
    name: tag?.name || '',
    createdAt: tag?.createdAt || now,
    updatedAt: tag?.updatedAt || tag?.createdAt || now,
    hidden: !!tag?.hidden,
    struck: !!tag?.struck,
    meta: tag?.meta || {},
  }

  return {
    ...normalized,
    parsed: parseTagName(normalized.name),
    createdAtFormatted: formatDate(normalized.createdAt),
    updatedAtFormatted: formatDate(normalized.updatedAt),
  }
}

function serializeTag(tag) {
  return {
    id: tag.id,
    name: tag.name,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
    hidden: tag.hidden,
    struck: tag.struck,
    meta: tag.meta,
  }
}

function getInitialTags() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) return parsed.map(normalizeTag)
    }
  } catch (error) {
    console.error(error)
  }

  const initialTags = Array.isArray(rawData?.tags)
    ? rawData.tags
    : Array.isArray(rawData)
      ? rawData
      : []

  return initialTags.map(normalizeTag)
}

const tagsState = ref(getInitialTags())
const undoStack = ref([])

const viewMode = ref(localStorage.getItem(VIEW_KEY) || 'grid-list')
const pageSizeState = ref(Number(localStorage.getItem(PAGE_SIZE_KEY) || 20))
const imgSizeMode = ref(localStorage.getItem(IMG_SIZE_KEY) || 'md')
const bodyWidthMode = ref(localStorage.getItem(BODY_WIDTH_KEY) || 'default')

watch(
  tagsState,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value.map(serializeTag)))
  },
  { deep: true }
)

watch(viewMode, (value) => localStorage.setItem(VIEW_KEY, value))
watch(pageSizeState, (value) => localStorage.setItem(PAGE_SIZE_KEY, String(value)))
watch(imgSizeMode, (value) => localStorage.setItem(IMG_SIZE_KEY, value))
watch(bodyWidthMode, (value) => localStorage.setItem(BODY_WIDTH_KEY, value))

function setBodyWidthMode(mode) {
  bodyWidthMode.value = mode
}

function pushUndoSnapshot() {
  undoStack.value.push(tagsState.value.map(serializeTag))
  if (undoStack.value.length > 40) undoStack.value.shift()
}

function replaceTags(nextTags) {
  tagsState.value = nextTags.map(normalizeTag)
}

function getLangType(str) {
  const s = (str || '').trim()

  if (/[\u4E00-\u9FFF]/.test(s)) return 'zh'
  if (/[A-Za-z]/.test(s)) return 'en'
  return 'other'
}

export function useTagManager() {
  const parsedTags = computed(() => tagsState.value)

  const stats = computed(() => ({
    totalTags: parsedTags.value.length,
    visibleTags: parsedTags.value.filter((tag) => !tag.hidden).length,
    hiddenTags: parsedTags.value.filter((tag) => tag.hidden).length,
    textCount: parsedTags.value.filter((item) => item.parsed.type === 'text').length,
    imageCount: parsedTags.value.filter((item) => item.parsed.type === 'image').length,
    iframeCount: parsedTags.value.filter((item) => item.parsed.type === 'iframe').length,
    videoCount: parsedTags.value.filter((item) => item.parsed.type === 'video').length,
  }))

  function addTag(input) {
    const content = normalizeInputToTagContent(input)
    if (!content) return

    pushUndoSnapshot()

    const now = new Date().toISOString()
    const newTag = normalizeTag({
      id: generateTagId(),
      name: content.length > 3000 ? content : formatParagraphs(content),
      createdAt: now,
      updatedAt: now,
      hidden: false,
      struck: false,
      meta: { source: 'manual' },
    })

    tagsState.value = [newTag, ...tagsState.value]
  }

  function editTag(id, newName) {
    pushUndoSnapshot()
    const now = new Date().toISOString()

    tagsState.value = tagsState.value.map((tag) => {
      if (tag.id !== id) return tag
      const finalName = newName.length > 3000 ? newName : formatParagraphs(newName)
      return normalizeTag({
        ...tag,
        name: finalName,
        updatedAt: now,
      })
    })
  }

  function deleteTag(id) {
    pushUndoSnapshot()
    tagsState.value = tagsState.value.filter((tag) => tag.id !== id)
  }

  function toggleHideTag(id) {
    pushUndoSnapshot()
    tagsState.value = tagsState.value.map((tag) => {
      if (tag.id !== id) return tag
      return normalizeTag({
        ...tag,
        hidden: !tag.hidden,
      })
    })
  }

  function toggleStrikeTag(id) {
    pushUndoSnapshot()
    tagsState.value = tagsState.value.map((tag) => {
      if (tag.id !== id) return tag
      return normalizeTag({
        ...tag,
        struck: !tag.struck,
      })
    })
  }

  function undo() {
    const snapshot = undoStack.value.pop()
    if (!snapshot) return
    tagsState.value = snapshot.map(normalizeTag)
  }

  function reverseTags() {
    pushUndoSnapshot()
    tagsState.value = [...tagsState.value].reverse()
  }

  function randomizeTags() {
    pushUndoSnapshot()
    const arr = [...tagsState.value]
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    tagsState.value = arr
  }

  function sortByLength() {
    pushUndoSnapshot()

    const englishFirst = sortByLength._englishFirst = !sortByLength._englishFirst

    const zhCollator = new Intl.Collator('zh-Hant-u-co-stroke', {
      sensitivity: 'base',
      numeric: true,
    })

    const enCollator = new Intl.Collator('en', {
      sensitivity: 'base',
      numeric: true,
    })

    tagsState.value = [...tagsState.value].sort((a, b) => {
      const aName = (a.name || '').trim()
      const bName = (b.name || '').trim()

      const aType = getLangType(aName)
      const bType = getLangType(bName)

      const getTypeOrder = (type) => {
        if (englishFirst) {
          if (type === 'en') return 0
          if (type === 'zh') return 1
          return 2
        } else {
          if (type === 'zh') return 0
          if (type === 'en') return 1
          return 2
        }
      }

      const typeDiff = getTypeOrder(aType) - getTypeOrder(bType)
      if (typeDiff !== 0) return typeDiff

      const lenDiff = [...aName].length - [...bName].length
      if (lenDiff !== 0) return lenDiff

      if (aType === 'zh' && bType === 'zh') {
        return zhCollator.compare(aName, bName)
      }

      if (aType === 'en' && bType === 'en') {
        return enCollator.compare(aName, bName)
      }

      return aName.localeCompare(bName)
    })
  }
  sortByLength._englishFirst = false

  function removeDuplicates() {
    pushUndoSnapshot()
    tagsState.value = removeDuplicateTags(tagsState.value).map(normalizeTag)
  }

  function importTagsFromFileContent(jsonText) {
    const parsed = JSON.parse(jsonText)

    let incoming = []
    if (Array.isArray(parsed)) {
      incoming = parsed
    } else if (parsed && Array.isArray(parsed.tags)) {
      incoming = parsed.tags
    } else {
      throw new Error('Invalid JSON format')
    }

    pushUndoSnapshot()

    const merged = [...tagsState.value.map((t) => ({ ...serializeTag(t) }))]
    for (const item of incoming) {
      merged.push(item)
    }

    tagsState.value = removeDuplicateTags(merged).map(normalizeTag)
  }

  async function importTagsFromFileContentWithWorker(jsonText) {
    const worker = new Worker(new URL('../workers/tagImport.worker.js', import.meta.url), {
      type: 'module',
    })

    const incoming = await new Promise((resolve, reject) => {
      worker.onmessage = (event) => {
        const data = event.data || {}
        worker.terminate()

        if (data.ok) resolve(data.tags || [])
        else reject(new Error(data.error || 'Import failed'))
      }

      worker.onerror = (error) => {
        worker.terminate()
        reject(error)
      }

      worker.postMessage({ text: jsonText })
    })

    pushUndoSnapshot()

    const merged = [...tagsState.value.map((t) => ({ ...serializeTag(t) }))]
    for (const item of incoming) {
      merged.push(item)
    }

    tagsState.value = removeDuplicateTags(merged).map(normalizeTag)
  }

  function exportTagsToFile() {
    const payload = {
      exportedAt: new Date().toISOString(),
      totalTags: tagsState.value.length,
      tags: tagsState.value.map(serializeTag),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tags-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportImageTags() {
    const imageTags = tagsState.value
      .filter((tag) => tag.parsed.type === 'image')
      .map(serializeTag)

    const blob = new Blob([JSON.stringify(imageTags, null, 2)], {
      type: 'application/json',
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'image-tags.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copyAllJson() {
    const payload = JSON.stringify(tagsState.value.map(serializeTag), null, 2)
    await navigator.clipboard.writeText(payload)
  }

  function clearAllTags() {
    pushUndoSnapshot()
    tagsState.value = []
  }

  function setViewMode(mode) {
    viewMode.value = mode
  }

  function setPageSize(size) {
    pageSizeState.value = size
  }

  function setImgSizeMode(mode) {
    imgSizeMode.value = mode
  }

  return {
    parsedTags,
    stats,
    viewMode,
    pageSizeState,
    imgSizeMode,
    bodyWidthMode,
    addTag,
    editTag,
    deleteTag,
    toggleHideTag,
    toggleStrikeTag,
    undo,
    reverseTags,
    randomizeTags,
    sortByLength,
    removeDuplicates,
    importTagsFromFileContent,
    importTagsFromFileContentWithWorker,
    exportTagsToFile,
    exportImageTags,
    copyAllJson,
    clearAllTags,
    setViewMode,
    setPageSize,
    setImgSizeMode,
    setBodyWidthMode,
  }
}