<template>
  <teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="handleClose">
      <div class="edit-modal">
        <div class="edit-modal-header">
          <h3>Edit Tag</h3>
          <button class="icon-btn" @click="handleClose">✕</button>
        </div>

        <div class="edit-modal-body">
          <div class="edit-pane">
            <label class="edit-label">Content</label>
            <textarea
              v-model="draft"
              class="edit-textarea"
              rows="16"
              placeholder="Edit tag content..."
            ></textarea>
          </div>

          <div class="preview-pane">
            <label class="edit-label">Preview</label>

            <div v-if="isMedia" class="preview-box">
              <div class="preview-note">
                Media / HTML content preview is shown as raw content for performance and safety.
              </div>
              <pre class="preview-raw">{{ draft }}</pre>
            </div>

            <div v-else class="preview-box prose-text" v-html="previewHtml"></div>
          </div>
        </div>

        <div class="edit-modal-footer">
          <button class="toolbar-btn" @click="handleClose">Cancel</button>
          <button class="toolbar-btn primary" @click="handleSave">Save</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { detectType } from '../utils/tagUtils'
import { highlightHtml, parseSearchQuery } from '../utils/search'

const props = defineProps({
  open: { type: Boolean, default: false },
  tag: { type: Object, default: null },
  searchQuery: { type: String, default: '' },
})

const emit = defineEmits(['close', 'save'])
const draft = ref('')

watch(
  () => props.open,
  (value) => {
    if (value) draft.value = props.tag?.name || ''
  },
  { immediate: true }
)

watch(
  () => props.tag,
  (value) => {
    if (props.open) draft.value = value?.name || ''
  },
  { immediate: true }
)

const isMedia = computed(() => detectType(draft.value) !== 'text')

const previewHtml = computed(() => {
  const parsed = parseSearchQuery(props.searchQuery)
  return highlightHtml(draft.value, parsed.termsForHighlight)
})

function handleClose() {
  emit('close')
}

function handleSave() {
  emit('save', draft.value)
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
}
.edit-modal-header,
.edit-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(17, 17, 17, 0.08);
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
.edit-label {
  display: inline-block;
  font-size: 0.92rem;
  font-weight: 700;
  margin-bottom: 10px;
}
.edit-textarea {
  width: 100%;
  min-height: 420px;
  resize: vertical;
  border-radius: 18px;
  border: 1px solid rgba(17, 17, 17, 0.14);
  padding: 14px 16px;
  font: inherit;
  line-height: 1.7;
  outline: none;
}
.preview-box {
  min-height: 420px;
  border-radius: 18px;
  border: 1px solid rgba(17, 17, 17, 0.1);
  background: #fafafa;
  padding: 16px;
  overflow: auto;
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
.icon-btn {
  border: none;
  background: transparent;
  font-size: 1.1rem;
  cursor: pointer;
}
:deep(mark.hl) {
  background: #fff2a8;
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