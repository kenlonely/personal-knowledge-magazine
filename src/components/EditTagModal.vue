<template>
  <teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="handleClose">
      <div class="edit-modal" :class="typeClass">
        <div class="edit-modal-header">
          <div>
            <h3 class="modal-title">Edit Tag</h3>
            <p class="header-subtitle">Edit content and UI metadata</p>
          </div>
          <button class="icon-btn" type="button" @click="handleClose">✕</button>
        </div>

        <div class="edit-modal-body">
          <div class="edit-pane">
            <label class="edit-label">Content</label>
            <textarea
              v-model="draft.name"
              class="edit-textarea"
              rows="16"
              placeholder="Edit tag content..."
            ></textarea>

            <div class="meta-grid">
              <div class="meta-field">
                <label class="edit-label">Badge</label>
                <input
                  v-model="draft.meta.badge"
                  class="edit-input"
                  type="text"
                  placeholder="e.g. Important"
                />
              </div>
            </div>

            <div class="meta-field">
              <label class="edit-label">Highlights</label>

              <div class="highlight-builder">
                <input
                  v-model="newHighlightText"
                  class="edit-input highlight-text-input"
                  type="text"
                  placeholder="Type highlight text..."
                  @keydown.enter.prevent="addHighlightItem"
                />
                <input
                  v-model="newHighlightColor"
                  class="color-input"
                  type="color"
                  aria-label="Highlight color"
                />
                <button class="toolbar-btn add-btn" type="button" @click="addHighlightItem">
                  Add
                </button>
              </div>

              <div class="field-help">
                Drag-select text in the preview below to add a highlight automatically.
              </div>
            </div>

            <div class="meta-field">
              <label class="edit-label">Note</label>
              <textarea
                v-model="draft.meta.note"
                class="edit-textarea note-textarea"
                rows="4"
                placeholder="Optional note..."
              ></textarea>
            </div>
          </div>

          <div class="preview-pane">
            <label class="edit-label">Preview</label>

            <div v-if="isMedia" class="preview-box">
              <div class="preview-note">
                Media / HTML content preview is shown as raw content for performance and safety.
              </div>
              <pre class="preview-raw">{{ draft.name }}</pre>
            </div>

            <div
              v-else
              ref="previewEl"
              class="preview-box prose-text selectable-preview"
              v-html="previewHtml"
              @mouseup="handlePreviewMouseUp"
            ></div>

            <div class="preview-meta">
              <div v-if="draft.meta.badge" class="preview-badge">
                {{ draft.meta.badge }}
              </div>

              <div v-if="highlightItems.length" class="preview-highlights">
                <span
                  v-for="(item, index) in highlightItems"
                  :key="`${item.text}-${item.color}-${index}`"
                  class="preview-chip"
                  :style="{ backgroundColor: item.color }"
                >
                  <span>{{ item.text }}</span>
                  <button class="chip-delete-btn" type="button" @click="removeHighlight(index)">
                    ×
                  </button>
                </span>
              </div>

              <div v-if="draft.meta.note" class="preview-note-box">
                {{ draft.meta.note }}
              </div>
            </div>
          </div>
        </div>

        <div class="edit-modal-footer">
          <button class="toolbar-btn" type="button" @click="handleClose">Cancel</button>
          <button class="toolbar-btn primary" type="button" @click="handleSave">Save</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { detectType } from '../utils/tagUtils'
import { parseSearchQuery } from '../utils/search'

const props = defineProps({
  open: { type: Boolean, default: false },
  tag: { type: Object, default: null },
  searchQuery: { type: String, default: '' },
})

const emit = defineEmits(['close', 'save'])

const draft = reactive({
  name: '',
  meta: {
    badge: '',
    note: '',
    highlights: [],
  },
})

const previewEl = ref(null)
const newHighlightText = ref('')
const newHighlightColor = ref('#fff2a8')

function clampColor(value, fallback = '#fff2a8') {
  const v = String(value || '').trim()
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback
}

function normalizeText(text) {
  return String(text || '').trim()
}

function uniqueHighlights(list) {
  const seen = new Set()
  const result = []

  for (const item of list) {
    const text = normalizeText(item?.text)
    const color = clampColor(item?.color)
    if (!text) continue

    const key = `${text.toLowerCase()}::${color.toLowerCase()}`
    if (seen.has(key)) continue

    seen.add(key)
    result.push({ text, color })
  }

  return result
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function syncDraftFromTag(tag) {
  draft.name = tag?.name || ''
  draft.meta.badge = tag?.meta?.badge || ''
  draft.meta.note = tag?.meta?.note || ''

  const rawHighlights = Array.isArray(tag?.meta?.highlights) ? tag.meta.highlights : []
  draft.meta.highlights = uniqueHighlights(
    rawHighlights.map((item) => {
      if (typeof item === 'string') {
        return { text: item, color: '#fff2a8' }
      }
      return {
        text: item?.text ?? item?.word ?? '',
        color: item?.color ?? '#fff2a8',
      }
    })
  )

  newHighlightText.value = ''
  newHighlightColor.value = '#fff2a8'
}

watch(
  () => props.open,
  (value) => {
    if (value) syncDraftFromTag(props.tag)
  },
  { immediate: true }
)

watch(
  () => props.tag,
  (value) => {
    if (props.open) syncDraftFromTag(value)
  },
  { immediate: true }
)

const tagType = computed(() => detectType(draft.name))
const isMedia = computed(() => tagType.value !== 'text')
const typeClass = computed(() => `type-${tagType.value}`)

const highlightItems = computed(() => uniqueHighlights(draft.meta.highlights))

function highlightTextToRegex(text) {
  const escaped = String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(${escaped})`, 'gi')
}

function buildHighlightedHtml(rawText, items) {
  let html = escapeHtml(rawText)

  const sorted = [...items].sort((a, b) => b.text.length - a.text.length)

  for (const item of sorted) {
    const regex = highlightTextToRegex(item.text)
    html = html.replace(regex, (match) => {
      return `<mark class="hl" style="background-color: ${item.color}">${escapeHtml(match)}</mark>`
    })
  }

  return html.replace(/\n/g, '<br>')
}

const previewHtml = computed(() => {
  const parsed = parseSearchQuery(props.searchQuery)
  const searchTerms = Array.isArray(parsed?.termsForHighlight) ? parsed.termsForHighlight : []

  const combined = uniqueHighlights([
    ...searchTerms.map((term) => ({ text: term, color: '#dbeafe' })),
    ...highlightItems.value,
  ])

  return buildHighlightedHtml(draft.name, combined)
})

function addHighlightItem() {
  const text = normalizeText(newHighlightText.value)
  if (!text) return

  const next = uniqueHighlights([
    ...highlightItems.value,
    { text, color: clampColor(newHighlightColor.value) },
  ])

  draft.meta.highlights = next
  newHighlightText.value = ''
}

function addHighlightWord(word) {
  const text = normalizeText(word)
  if (!text) return

  const next = uniqueHighlights([
    ...highlightItems.value,
    { text, color: clampColor(newHighlightColor.value) },
  ])

  draft.meta.highlights = next
}

function removeHighlight(index) {
  const next = highlightItems.value.slice()
  next.splice(index, 1)
  draft.meta.highlights = next
}

async function handlePreviewMouseUp() {
  await nextTick()

  const selection = window.getSelection()
  const selectedText = selection?.toString()?.trim?.() || ''
  if (!selectedText) return
  if (!previewEl.value) return

  const anchorNode = selection?.anchorNode
  const focusNode = selection?.focusNode

  const inPreview =
    anchorNode &&
    focusNode &&
    previewEl.value.contains(anchorNode) &&
    previewEl.value.contains(focusNode)

  if (!inPreview) return

  addHighlightWord(selectedText)
  selection.removeAllRanges()
}

function handleClose() {
  emit('close')
}

function handleSave() {
  emit('save', {
    name: draft.name,
    meta: {
      badge: draft.meta.badge?.trim?.() || '',
      note: draft.meta.note?.trim?.() || '',
      highlights: highlightItems.value,
    },
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  z-index: 9999;
  padding: 24px;
}

.edit-modal {
  width: min(1200px, 100%);
  max-height: 90vh;
  overflow: hidden;
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  position: relative;
  --type-color: #111;
  --type-soft: rgba(17, 17, 17, 0.08);
  --type-bg: #fafafa;
  --type-mark: #fff2a8;
}

.edit-modal.type-text {
  --type-color: #2563eb;
  --type-soft: rgba(37, 99, 235, 0.12);
  --type-bg: #eff6ff;
  --type-mark: #dbeafe;
}

.edit-modal.type-image {
  --type-color: #16a34a;
  --type-soft: rgba(22, 163, 74, 0.12);
  --type-bg: #ecfdf5;
  --type-mark: #bbf7d0;
}

.edit-modal.type-iframe {
  --type-color: #8b5cf6;
  --type-soft: rgba(139, 92, 246, 0.12);
  --type-bg: #f5f3ff;
  --type-mark: #ddd6fe;
}

.edit-modal.type-video {
  --type-color: #f97316;
  --type-soft: rgba(249, 115, 22, 0.12);
  --type-bg: #fff7ed;
  --type-mark: #fed7aa;
}

.edit-modal-header,
.edit-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(17, 17, 17, 0.08);
}

.edit-modal-header {
  border-left: 6px solid var(--type-color);
}

.edit-modal-footer {
  border-top: 1px solid rgba(17, 17, 17, 0.08);
  border-bottom: none;
  justify-content: flex-end;
  gap: 12px;
}

.edit-modal-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px;
  overflow: auto;
}

.edit-pane,
.preview-pane {
  min-width: 0;
}

.modal-title {
  margin: 0;
  color: var(--type-color);
}

.edit-label {
  display: inline-block;
  font-size: 0.92rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: #222;
}

.header-subtitle {
  margin: 6px 0 0;
  color: #666;
  font-size: 0.88rem;
}

.edit-textarea,
.edit-input {
  width: 100%;
  border-radius: 18px;
  border: 1px solid rgba(17, 17, 17, 0.14);
  padding: 14px 16px;
  font: inherit;
  line-height: 1.7;
  outline: none;
  background: #fff;
}

.edit-textarea {
  min-height: 320px;
  resize: vertical;
}

.note-textarea {
  min-height: 140px;
}

.edit-input {
  min-height: 48px;
}

.edit-textarea:focus,
.edit-input:focus {
  border-color: var(--type-color);
  box-shadow: 0 0 0 3px var(--type-soft);
}

.meta-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: 1fr;
  margin-top: 16px;
}

.meta-field {
  margin-top: 16px;
}

.field-help {
  margin-top: 8px;
  font-size: 0.84rem;
  color: #666;
}

.highlight-builder {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
}

.highlight-text-input {
  min-width: 0;
}

.color-input {
  width: 52px;
  height: 52px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.add-btn {
  height: 52px;
  padding: 0 16px;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  background: var(--type-color);
  color: #fff;
  font-weight: 700;
}

.preview-box {
  min-height: 420px;
  border-radius: 18px;
  border: 1px solid rgba(17, 17, 17, 0.1);
  background: var(--type-bg);
  padding: 16px;
  overflow: auto;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.preview-raw {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.preview-note {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 12px;
}

.prose-text {
  white-space: normal;
  line-height: 1.8;
  word-break: break-word;
}

.selectable-preview {
  user-select: text;
  cursor: text;
}

.preview-meta {
  margin-top: 14px;
  display: grid;
  gap: 10px;
}

.preview-badge {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--type-color);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.preview-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 999px;
  color: #111;
  font-size: 12px;
}

.chip-delete-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: inherit;
  padding: 0;
  opacity: 0.7;
}

.chip-delete-btn:hover {
  opacity: 1;
  color: #d11;
}

.preview-note-box {
  font-size: 13px;
  line-height: 1.6;
  color: #555;
  white-space: pre-wrap;
}

.icon-btn {
  border: none;
  background: transparent;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--type-color);
}

.toolbar-btn {
  border: 1px solid rgba(17, 17, 17, 0.14);
  background: #fff;
  color: #222;
  padding: 10px 16px;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 600;
}

.toolbar-btn.primary {
  background: var(--type-color);
  color: #fff;
  border-color: transparent;
}

.toolbar-btn.primary:hover {
  filter: brightness(0.95);
}

:deep(mark.hl) {
  color: inherit;
  border-radius: 6px;
  padding: 0 2px;
}

@media (max-width: 900px) {
  .edit-modal-body {
    grid-template-columns: 1fr;
  }

  .edit-textarea,
  .preview-box {
    min-height: 280px;
  }

  .highlight-builder {
    grid-template-columns: 1fr;
  }

  .color-input,
  .add-btn {
    width: 100%;
  }
}
</style>