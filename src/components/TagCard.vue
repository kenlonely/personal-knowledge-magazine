<template>
  <article
    ref="rootEl"
    class="tag-card"
    :class="[
      sizeClass,
      `img-size-${imgSizeMode}`,
      tag?.meta?.styleClass,
      { 'is-hidden': tag.hidden, 'is-struck': tag.struck, 'is-expanded': isExpanded }
    ]"
  >
    <div v-if="['image', 'iframe', 'video'].includes(tag?.parsed?.type)" class="tag-media">
      <template v-if="tag?.parsed?.type === 'image' && tag?.parsed?.src">
        <div class="media-stage">
          <img
            :src="tag.parsed.src"
            :alt="tag.parsed.alt || tag.parsed.displayTitle || 'image'"
            loading="lazy"
          />
        </div>
      </template>

      <template v-else-if="tag?.parsed?.type === 'iframe' && tag?.parsed?.src">
        <iframe
          class="tag-iframe"
          :src="tag.parsed.src"
          :title="tag.parsed.displayTitle || 'iframe'"
          frameborder="0"
          allowfullscreen
        ></iframe>
      </template>

      <template v-else-if="tag?.parsed?.type === 'video' && tag?.parsed?.src">
        <video controls preload="metadata" class="tag-video">
          <source :src="tag.parsed.src" type="video/mp4" />
        </video>
      </template>
    </div>

    <div class="tag-body">
      <div class="tag-content">
        <template v-if="isTextType">
          <div class="text-content prose-text">
            <div v-if="showSnippetMode" class="snippet-box">
              <template v-if="snippetHtmlList.length">
                <div
                  v-for="(snippet, index) in snippetHtmlList"
                  :key="`${tag.id}-snippet-${index}`"
                  class="snippet-item"
                  v-html="snippet.html"
                ></div>
              </template>

              <template v-else>
                <div v-html="fallbackSnippetHtml"></div>
              </template>
            </div>

            <template v-else-if="isLong && !showFullText">


              <div class="chunk-block">
                <p
                  v-html="highlightText(visibleText, normalizedSearchTerms, {
                    termColors: highlightColorMap.value
                  })"
                ></p>
              </div>
            </template>

            <template v-else>
              <div v-html="fullHtml"></div>
            </template>
                          <div class="load-actions">
                <input
                  v-model="customVisibleLength"
                  type="number"
                  min="1"
                  class="length-input"
                  placeholder="輸入要顯示的字數"
                />
                <button class="load-more-btn" type="button" @click="applyVisibleLength">
                  顯示
                </button>
                <button class="load-more-btn" type="button" @click="loadFull">
                  Load Full
                </button>
              </div>
          </div>
        </template>
      </div>

      <div class="body-header">
        <div
          class="card-kicker"
          v-html="renderHighlightedText(tag?.parsed?.type || '', normalizedSearchTerms)"
        ></div>

        <button class="toggle-btn" type="button" @click="toggleBody">
          {{ isExpanded ? '收起資訊' : '展開資訊' }}
        </button>
      </div>

      <transition name="fade-slide">
        <div v-show="isExpanded" class="tag-body-more">
          <h3
            v-if="tag?.parsed?.type !== 'text'"
            class="tag-title"
            v-html="renderHighlightedText(tag?.parsed?.displayTitle || '', normalizedSearchTerms)"
          ></h3>

          <div
            v-if="showRawMediaCode"
            class="raw-code"
            v-html="renderHighlightedText(tag?.name || '', normalizedSearchTerms)"
          ></div>

          <div v-if="tag?.meta?.badge || tag?.meta?.note" class="info-block">
            <div
              v-if="tag?.meta?.badge"
              class="tag-badge"
              v-html="renderHighlightedText(tag.meta.badge, normalizedSearchTerms)"
            ></div>

            <p
              v-if="tag?.meta?.note"
              class="tag-note"
              v-html="renderHighlightedText(tag.meta.note, normalizedSearchTerms)"
            ></p>
          </div>

          <div class="meta-row">
            <span v-html="renderHighlightedText(`ID: ${tag?.id}`, normalizedSearchTerms)"></span>
            <span
              v-html="renderHighlightedText(`Updated: ${tag?.updatedAtFormatted || ''}`, normalizedSearchTerms)"
            ></span>
          </div>

          <div class="action-row">
            <button class="action-btn" type="button" @click="emit('edit', tag)">Edit</button>
            <button class="action-btn" type="button" @click="emit('delete', tag.id)">Delete</button>
            <button class="action-btn" type="button" @click="handleCopy">Copy</button>
            <button class="action-btn" type="button" @click="emit('toggle-hide', tag.id)">
              {{ tag.hidden ? 'Unhide' : 'Hide' }}
            </button>
            <button class="action-btn" type="button" @click="emit('toggle-strike', tag.id)">
              {{ tag.struck ? 'Unstrike' : 'Strike' }}
            </button>
          </div>
        </div>
      </transition>
    </div>
  </article>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  tag: {
    type: Object,
    required: true
  },
  sizeClass: {
    type: String,
    default: ''
  },
  imgSizeMode: {
    type: String,
    default: 'md'
  },
  searchTerms: {
    type: Array,
    default: () => []
  },
  hasActiveSearch: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['edit', 'delete', 'toggle-hide', 'toggle-strike'])

const rootEl = ref(null)
const isExpanded = ref(false)
const showFullText = ref(false)
const customVisibleLength = ref(300)

const isTextType = computed(() => props.tag?.parsed?.type === 'text')

const rawText = computed(() => {
  if (!isTextType.value) return ''
  return props.tag?.parsed?.displayTitle || props.tag?.name || ''
})

const visibleText = computed(() => {
  if (!isTextType.value) return ''
  const text = rawText.value.trim()
  if (!text) return ''
  if (showFullText.value) return text
  return text.slice(0, Math.min(Number(customVisibleLength.value) || 0, text.length))
})

const showRawMediaCode = computed(() => {
  return ['image', 'iframe', 'video'].includes(props.tag?.parsed?.type)
})

function applyVisibleLength() {
  const n = Number(customVisibleLength.value)
  if (Number.isNaN(n) || n < 1) {
    customVisibleLength.value = 1
    return
  }

  customVisibleLength.value = n
  showFullText.value = false
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeRegExp(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeTerm(term = '') {
  return String(term)
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeTerms(terms = []) {
  return [...new Set(
    (Array.isArray(terms) ? terms : [terms])
      .flatMap((item) => String(item).split(/[\s,]+/g))
      .map(normalizeTerm)
      .filter(Boolean)
  )].sort((a, b) => b.length - a.length)
}

function buildHighlightRegex(terms = []) {
  const cleanTerms = normalizeTerms(terms).map(escapeRegExp).filter(Boolean)
  if (!cleanTerms.length) return null
  return new RegExp(`(${cleanTerms.join('|')})`, 'gi')
}

const metaHighlights = computed(() => {
  const raw = Array.isArray(props.tag?.meta?.highlights) ? props.tag.meta.highlights : []

  return raw
    .map((item) => {
      if (typeof item === 'string') {
        const text = normalizeTerm(item)
        return text ? { text, color: '#fff2a8' } : null
      }

      const text = normalizeTerm(item?.text || item?.word || '')
      const color = String(item?.color || '#fff2a8').trim()
      if (!text) return null
      return { text, color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#fff2a8' }
    })
    .filter(Boolean)
})

const normalizedSearchTerms = computed(() => {
  const fromSearch = Array.isArray(props.searchTerms) ? props.searchTerms : []
  const fromMeta = metaHighlights.value.map((item) => item.text)
  return normalizeTerms([...fromSearch, ...fromMeta])
})

const highlightColorMap = computed(() => {
  const map = new Map()

  for (const item of metaHighlights.value) {
    map.set(item.text.toLowerCase(), item.color)
  }

  return map
})

function highlightText(text = '', terms = [], options = {}) {
  const {
    markClass = 'hl',
    wrapTag = 'mark',
    preserveNewlines = true,
    escape = true,
    maxTerms = 50,
    termColors = new Map()
  } = options

  const raw = String(text ?? '')
  const cleanTerms = normalizeTerms(terms).slice(0, maxTerms)
  const outputText = escape ? escapeHtml(raw) : raw
  const regex = buildHighlightRegex(cleanTerms)

  if (!regex) {
    return preserveNewlines ? outputText.replace(/\n/g, '<br>') : outputText
  }

  const highlighted = outputText.replace(regex, (match) => {
    const color = termColors.get(normalizeTerm(match).toLowerCase()) || '#fff2a8'
    return `<${wrapTag} class="${markClass}" style="background-color: ${color}">${match}</${wrapTag}>`
  })

  return preserveNewlines ? highlighted.replace(/\n/g, '<br>') : highlighted
}

function renderHighlightedText(text, terms = []) {
  return highlightText(text, terms, {
    termColors: highlightColorMap.value
  })
}

function findMatches(text, terms = []) {
  const rawText = String(text ?? '')
  const cleanTerms = normalizeTerms(terms)
  const matches = []

  if (!rawText || !cleanTerms.length) return matches

  for (const term of cleanTerms) {
    const regex = new RegExp(escapeRegExp(term), 'gi')
    let match

    while ((match = regex.exec(rawText)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        term: match[0]
      })

      if (regex.lastIndex === match.index) regex.lastIndex += 1
    }
  }

  return matches.sort((a, b) => a.index - b.index)
}

function mergeRanges(ranges, gap = 50) {
  if (!ranges.length) return []

  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const merged = []
  let current = { ...sorted[0] }

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]

    if (next.start <= current.end + gap) {
      current.end = Math.max(current.end, next.end)
    } else {
      merged.push(current)
      current = { ...next }
    }
  }

  merged.push(current)
  return merged
}

function buildSearchSnippets(text = '', terms = [], options = {}) {
  const {
    radius = 120,
    maxSnippets = 5,
    mergeGap = 80
  } = options

  const rawText = String(text ?? '')
  const matches = findMatches(rawText, terms)

  if (!matches.length) {
    const fallback = rawText.slice(0, radius * 2)
    return fallback ? [{ html: highlightText(fallback, terms, { termColors: highlightColorMap.value }) }] : []
  }

  const ranges = matches.map((m) => ({
    start: Math.max(0, m.index - radius),
    end: Math.min(rawText.length, m.index + m.length + radius)
  }))

  const merged = mergeRanges(ranges, mergeGap).slice(0, maxSnippets)

  return merged.map((range) => {
    const prefix = range.start > 0 ? '...' : ''
    const suffix = range.end < rawText.length ? '...' : ''
    const snippet = `${prefix}${rawText.slice(range.start, range.end)}${suffix}`

    return {
      html: highlightText(snippet, terms, { termColors: highlightColorMap.value }),
      start: range.start,
      end: range.end
    }
  })
}

const paragraphs = computed(() => {
  if (!isTextType.value) return []
  return rawText.value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
})

const isLong = computed(() => {
  return rawText.value.length > 300 || paragraphs.value.length > 3
})

const fullHtml = computed(() => {
  if (!isTextType.value) return ''

  return paragraphs.value
    .map((chunk) => {
      const lines = chunk
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      return `
        <div class="chunk-block">
          ${lines
            .map(
              (line) =>
                `<p>${highlightText(line, normalizedSearchTerms.value, {
                  termColors: highlightColorMap.value
                })}</p>`
            )
            .join('')}
        </div>
      `
    })
    .join('')
})

const showSnippetMode = computed(() => {
  return Boolean(props.hasActiveSearch) && isTextType.value
})

const snippetHtmlList = computed(() => {
  if (!showSnippetMode.value) return []

  return buildSearchSnippets(rawText.value, normalizedSearchTerms.value, {
    radius: 120,
    maxSnippets: 5,
    mergeGap: 80
  })
})

const fallbackSnippetHtml = computed(() => {
  if (!showSnippetMode.value) return ''
  return `<p>${highlightText(rawText.value.slice(0, 240), normalizedSearchTerms.value, {
    termColors: highlightColorMap.value
  })}</p>`
})

function toggleBody() {
  isExpanded.value = !isExpanded.value
  if (!isExpanded.value) {
    showFullText.value = false
    customVisibleLength.value = 300
  }
}

function loadFull() {
  showFullText.value = true
}

watch(
  () => props.tag?.id,
  () => {
    isExpanded.value = false
    showFullText.value = false
    customVisibleLength.value = 300
  }
)

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.tag?.name || '')
  } catch (error) {
    console.error('Copy failed:', error)
  }
}
</script>

<style scoped>
.tag-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  min-height: 100%;
  border-radius: 24px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(17, 17, 17, 0.08);
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.tag-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 48px rgba(17, 17, 17, 0.12);
}

.tag-card.is-hidden {
  opacity: 0.68;
}

.tag-card.is-struck {
  filter: grayscale(0.15);
}

.tag-card.is-struck .tag-title,
.tag-card.is-struck .text-content,
.tag-card.is-struck .raw-code {
  text-decoration: line-through;
}

.tag-media {
  width: 100%;
  background: #f5f5f5;
}

.media-stage {
  width: 100%;
  display: grid;
  place-items: center;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.35)),
    #f1f1f1;
}

.tag-media img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  background: #f5f5f5;
}

.tag-video,
.tag-iframe {
  display: block;
  width: 100%;
  max-width: 100%;
  border: 0;
  background: #f3f3f3;
}

.img-size-sm .media-stage,
.img-size-sm .tag-video,
.img-size-sm .tag-iframe {
  width: 220px;
}

.img-size-md .media-stage,
.img-size-md .tag-video,
.img-size-md .tag-iframe {
  width: 320px;
}

.img-size-lg .media-stage,
.img-size-lg .tag-video,
.img-size-lg .tag-iframe {
  width: 460px;
}

.img-size-xl .media-stage,
.img-size-xl .tag-video,
.img-size-xl .tag-iframe {
  width: 620px;
}

.tag-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  min-width: 0;
}

.body-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-kicker {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a7a7a;
}

.toggle-btn {
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 9px 13px;
  background: #f2f2f2;
  color: #181818;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.16s ease, transform 0.16s ease;
  white-space: nowrap;
}

.toggle-btn:hover {
  background: #e8e8e8;
  transform: translateY(-1px);
}

.tag-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.text-content {
  color: #202020;
  line-height: 1.7;
  word-break: break-word;
}

.prose-text :deep(p) {
  margin: 0 0 12px;
  font-size: 20px;
  line-height: 1.9;
}

.prose-text :deep(p:last-child) {
  margin-bottom: 0;
}

.prose-text :deep(mark.hl) {
  color: inherit;
  padding: 0 2px;
  border-radius: 4px;
}

.chunk-block + .chunk-block {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #ececec;
}

.snippet-box {
  padding: 14px;
  border-radius: 14px;
  background: #faf8ef;
  border: 1px solid #eee2aa;
  display: grid;
  gap: 12px;
}

.snippet-item {
  padding: 10px 12px;
  border-radius: 12px;
  background: #fffdf4;
  border: 1px solid #f1e5a7;
  color: #333;
  line-height: 1.7;
}

.load-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.tag-body-more {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tag-title {
  margin: 0;
  font-size: 20px;
  line-height: 1.35;
  color: #171717;
  word-break: break-word;
}

.raw-code {
  padding: 12px 14px;
  border-radius: 14px;
  background: #f7f7f7;
  color: #444;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.info-block {
  display: grid;
  gap: 8px;
}

.tag-badge {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: #111;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.tag-note {
  margin: 0;
  color: #555;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 12px;
  color: #7b7b7b;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-btn,
.load-more-btn {
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  background: #f2f2f2;
  color: #181818;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.16s ease, transform 0.16s ease;
}

.action-btn:hover,
.load-more-btn:hover {
  background: #e8e8e8;
  transform: translateY(-1px);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 900px) {
  .img-size-sm .media-stage,
  .img-size-sm .tag-video,
  .img-size-sm .tag-iframe {
    height: 180px;
  }

  .img-size-md .media-stage,
  .img-size-md .tag-video,
  .img-size-md .tag-iframe {
    height: 240px;
  }

  .img-size-lg .media-stage,
  .img-size-lg .tag-video,
  .img-size-lg .tag-iframe {
    height: 320px;
  }

  .img-size-xl .media-stage,
  .img-size-xl .tag-video,
  .img-size-xl .tag-iframe {
    height: 400px;
  }

  .tag-body {
    padding: 14px;
  }

  .body-header {
    align-items: flex-start;
  }

  .prose-text :deep(p) {
    font-size: 18px;
  }
}

.length-input {
  width: 120px;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 999px;
  font-size: 13px;
  outline: none;
  background: #fff;
}

.length-input:focus {
  border-color: #999;
}
</style>