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
              <input
                v-model="highlightsText"
                class="edit-input"
                type="text"
                placeholder="Type comma separated words, or select text in preview"
              />
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

              <div v-if="highlightList.length" class="preview-highlights">
                <span
                  v-for="(item, index) in highlightList"
                  :key="`${item}-${index}`"
                  class="preview-chip"
                >
                  <span>{{ item }}</span>
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
import { highlightHtml, parseSearchQuery } from '../utils/search'

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
const highlightsText = ref('')

function normalizeHighlights(text) {
  return String(text || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function uniqueList(list) {
  return [...new Set(list.map((s) => String(s).trim()).filter(Boolean))]
}

function syncDraftFromTag(tag) {
  draft.name = tag?.name || ''
  draft.meta.badge = tag?.meta?.badge || ''
  draft.meta.note = tag?.meta?.note || ''
  draft.meta.highlights = Array.isArray(tag?.meta?.highlights) ? [...tag.meta.highlights] : []
  highlightsText.value = draft.meta.highlights.join(', ')
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

const highlightList = computed(() => normalizeHighlights(highlightsText.value))

const previewHtml = computed(() => {
  const parsed = parseSearchQuery(props.searchQuery)
  const searchTerms = Array.isArray(parsed?.termsForHighlight) ? parsed.termsForHighlight : []
  const allTerms = uniqueList([...searchTerms, ...highlightList.value])
  return highlightHtml(draft.name, allTerms)
})

function addHighlightWord(word) {
  const cleaned = String(word || '').trim()
  if (!cleaned) return

  const current = normalizeHighlights(highlightsText.value)
  const next = uniqueList([...current, cleaned])
  highlightsText.value = next.join(', ')
}

function removeHighlight(index) {
  const current = normalizeHighlights(highlightsText.value)
  current.splice(index, 1)
  highlightsText.value = current.join(', ')
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
      highlights: highlightList.value,
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
  background: rgba(17, 17, 17, 0.06);
  color: #444;
  font-size: 12px;
}

.chip-delete-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: #777;
  padding: 0;
}

.chip-delete-btn:hover {
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

.toolbar-btn.primary {
  background: var(--type-color);
  color: #fff;
}

.toolbar-btn.primary:hover {
  filter: brightness(0.95);
}

:deep(mark.hl) {
  background: var(--type-mark);
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
}
</style>