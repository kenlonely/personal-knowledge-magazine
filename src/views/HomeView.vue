<template>
  <main>
    <section class="section hero-lite">
      <div class="container" :class="`container-${bodyWidthMode}`">
        <div class="hero-panel">
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-label">Total</span>
              <strong class="stat-value">{{ stats.totalTags }}</strong>
            </div>
            <div class="stat-card">
              <span class="stat-label">Visible</span>
              <strong class="stat-value">{{ visibleCount }}</strong>
            </div>
            <div class="stat-card">
              <span class="stat-label">Text</span>
              <strong class="stat-value">{{ stats.textCount }}</strong>
            </div>
            <div class="stat-card">
              <span class="stat-label">Image</span>
              <strong class="stat-value">{{ stats.imageCount }}</strong>
            </div>            <div class="stat-card">
              <span class="stat-label">Iframe</span>
              <strong class="stat-value">{{ stats.iframeCount }}</strong>
            </div>            <div class="stat-card">
              <span class="stat-label">Video</span>
              <strong class="stat-value">{{ stats.videoCount }}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container" :class="`container-${bodyWidthMode}`">
        <div class="toolbar">
          <textarea
            v-model="newTagName"
            class="toolbar-input"
            rows="5"
            placeholder="Paste text, article, image URL, video URL, img/iframe..."
            @keydown="handleAddInputKeydown"
          ></textarea>

          <div class="toolbar-actions">
            <button class="toolbar-btn primary" @click="handleAddTag">Add</button>
            <button class="toolbar-btn" @click="triggerImport">Import</button>
            <button class="toolbar-btn" @click="handleExport">Export</button>
            <button class="toolbar-btn" @click="undoAndToast">Undo</button>
            <button class="toolbar-btn" @click="reverseAndToast">Reverse</button>
            <button class="toolbar-btn" @click="randomizeAndToast">Randomize</button>
            <button class="toolbar-btn" @click="sortAndToast">Sort Length</button>
            <button class="toolbar-btn" @click="duplicatesAndToast">Duplicates</button>
            <button class="toolbar-btn" @click="exportImagesAndToast">Export Images</button>
            <button class="toolbar-btn" @click="handleCopyAllJson">Copy JSON</button>
            <button class="toolbar-btn" @click="clearAllAndToast">Clear All</button>
            <button class="toolbar-btn" @click="toggleShowHidden">
              Hidden: {{ showHidden ? 'On' : 'Off' }}
            </button>

            <input
              ref="fileInput"
              type="file"
              accept=".json,application/json"
              class="hidden-file-input"
              @change="handleFileChange"
            />
            
          </div>

          <div class="toolbar-actions second-row">
            <input
              v-model="searchImmediate"
              class="toolbar-search"
              placeholder='Search... 例: "apple watch" | samsung  type:image  hidden:no'
            />

            <select v-model="selectedType" class="page-size-select">
              <option value="all">All</option>
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="iframe">Iframe</option>
              <option value="video">Video</option>
            </select>

            <select
              :value="viewMode"
              class="page-size-select"
              @change="setViewMode($event.target.value)"
            >
              <option value="grid-list">List</option>
              <option value="grid-2">Grid 2</option>
              <option value="grid-3">Grid 3</option>
              <option value="grid-4">Grid 4</option>
              <option value="split-img-text">Split Img/Text</option>
            </select>

            <select :value="pageSizeState" class="page-size-select" @change="handlePageSizeChange">
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>

            <select :value="imgSizeMode" class="page-size-select" @change="handleImgSizeChange">
              <option value="sm">Img S</option>
              <option value="md">Img M</option>
              <option value="lg">Img L</option>
              <option value="xl">Img XL</option>
            </select>

            <select :value="bodyWidthMode" class="page-size-select" @change="handleBodyWidthChange">
              <option value="narrow">Body Narrow</option>
              <option value="default">Body Default</option>
              <option value="wide">Body Wide</option>
              <option value="full">Body Full</option>
            </select>
          </div>
        </div>

        <div class="result-meta">
          <span v-if="viewMode !== 'split-img-text'">
            Showing {{ displayCount }} / {{ filteredAndRankedTags.length }}
          </span>

          <template v-else>
            <span>Media {{ splitImagePaginated.length }} / {{ splitImageTags.length }}</span>
            <span class="result-separator">•</span>
            <span>Text {{ splitTextPaginated.length }} / {{ splitTextTags.length }}</span>
          </template>

          <span class="result-separator">•</span>
          <span>Search: {{ search || '—' }}</span>
          <span class="result-separator">•</span>
          <span>Hidden Visible: {{ showHidden ? 'Yes' : 'No' }}</span>
        </div>

        <template v-if="viewMode !== 'split-img-text'">
          <div class="mag-grid" :class="viewMode">
            <TagCard
              v-for="(tag, index) in paginatedTags"
              :key="tag.id"
              :tag="tag"
              :index="index"
              :search-terms="parsedSearch.termsForHighlight"
              :has-active-search="hasActiveSearch"
              :img-size-mode="imgSizeMode"
              @edit="openEditModal"
              @delete="handleDeleteTag"
              @copy="showToast('Copied')"
              @find="handleFindTag"
              @toggle-hide="handleToggleHide"
              @toggle-strike="handleToggleStrike"
            />
          </div>
        </template>

        <template v-else>
          <div class="split-wrap">
            <div class="split-col">
              <h3>Images / Media</h3>

              <div class="mag-grid grid-2">
                <TagCard
                  v-for="(tag, index) in splitImagePaginated"
                  :key="tag.id"
                  :tag="tag"
                  :index="index"
                  :search-terms="parsedSearch.termsForHighlight"
                  :has-active-search="hasActiveSearch"
                  :img-size-mode="imgSizeMode"
                  @edit="openEditModal"
                  @delete="handleDeleteTag"
                  @copy="showToast('Copied')"
                  @find="handleFindTag"
                  @toggle-hide="handleToggleHide"
                  @toggle-strike="handleToggleStrike"
                />
              </div>

              <div class="pagination-bar">
                <div class="pagination-actions">
                  <button
                    class="toolbar-btn"
                    :disabled="splitImagePage <= 1"
                    @click="splitImagePage--"
                  >
                    Prev
                  </button>
                  <span class="page-indicator">
                    Page {{ splitImagePage }} / {{ splitImageTotalPages }}
                  </span>
                  <button
                    class="toolbar-btn"
                    :disabled="splitImagePage >= splitImageTotalPages"
                    @click="splitImagePage++"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <div class="split-col">
              <h3>Texts</h3>

              <div class="mag-grid grid-list">
                <TagCard
                  v-for="(tag, index) in splitTextPaginated"
                  :key="tag.id"
                  :tag="tag"
                  :index="index"
                  :search-terms="parsedSearch.termsForHighlight"
                  :has-active-search="hasActiveSearch"
                  :img-size-mode="imgSizeMode"
                  @edit="openEditModal"
                  @delete="handleDeleteTag"
                  @copy="showToast('Copied')"
                  @find="handleFindTag"
                  @toggle-hide="handleToggleHide"
                  @toggle-strike="handleToggleStrike"
                />
              </div>

              <div class="pagination-bar">
                <div class="pagination-actions">
                  <button
                    class="toolbar-btn"
                    :disabled="splitTextPage <= 1"
                    @click="splitTextPage--"
                  >
                    Prev
                  </button>
                  <span class="page-indicator">
                    Page {{ splitTextPage }} / {{ splitTextTotalPages }}
                  </span>
                  <button
                    class="toolbar-btn"
                    :disabled="splitTextPage >= splitTextTotalPages"
                    @click="splitTextPage++"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div v-if="viewMode !== 'split-img-text'" class="pagination-bar">
          <div class="pagination-actions">
            <button class="toolbar-btn" :disabled="currentPage <= 1" @click="prevPage">Prev</button>
            <span class="page-indicator">Page {{ currentPage }} / {{ totalPages }}</span>
            <button class="toolbar-btn" :disabled="currentPage >= totalPages" @click="nextPage">Next</button>
          </div>
        </div>
      </div>
    </section>

    <EditTagModal
      :open="editOpen"
      :tag="editingTag"
      :search-query="search"
      @close="closeEditModal"
      @save="saveEditModal"
    />

    <div v-if="toast" class="snackbar show">{{ toast }}</div>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import TagCard from '../components/TagCard.vue'
import EditTagModal from '../components/EditTagModal.vue'
import { useTagManager } from '../composables/useTagManager'
import { matchTagByParsedQuery, parseSearchQuery, scoreTag } from '../utils/search'

const {
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
  exportTagsToFile,
  exportImageTags,
  copyAllJson,
  clearAllTags,
  setViewMode,
  setPageSize,
  setImgSizeMode,
  setBodyWidthMode,
} = useTagManager()

const newTagName = ref('')
const fileInput = ref(null)
const selectedType = ref('all')
const currentPage = ref(1)
const splitImagePage = ref(1)
const splitTextPage = ref(1)
const searchImmediate = ref('')
const search = ref('')
const toast = ref('')
const editOpen = ref(false)
const editingTag = ref(null)
const showHidden = ref(false)

let debounceTimer = null
let toastTimer = null

watch(searchImmediate, (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    search.value = value.trim()
    currentPage.value = 1
    splitImagePage.value = 1
    splitTextPage.value = 1
  }, 260)
})

watch(
  () => [selectedType.value, viewMode.value, pageSizeState.value, showHidden.value],
  () => {
    currentPage.value = 1
    splitImagePage.value = 1
    splitTextPage.value = 1
  }
)

const parsedSearch = computed(() => parseSearchQuery(search.value))
const hasActiveSearch = computed(() => !!search.value.trim())

const filteredAndRankedTags = computed(() => {
  let arr = parsedTags.value.filter((tag) => {
    if (!showHidden.value && tag.hidden) return false

    const matchesType =
      selectedType.value === 'all' || tag.parsed.type === selectedType.value

    const matchesSearch = matchTagByParsedQuery(tag, parsedSearch.value)
    return matchesType && matchesSearch
  })

  if (hasActiveSearch.value) {
    arr = [...arr].sort((a, b) => scoreTag(b, parsedSearch.value) - scoreTag(a, parsedSearch.value))
  }

  return arr
})

const visibleCount = computed(() => {
  return parsedTags.value.filter((tag) => !tag.hidden).length
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredAndRankedTags.value.length / pageSizeState.value))
})

const paginatedTags = computed(() => {
  const start = (currentPage.value - 1) * pageSizeState.value
  return filteredAndRankedTags.value.slice(start, start + pageSizeState.value)
})

const displayCount = computed(() => paginatedTags.value.length)

const splitImageTags = computed(() => {
  return filteredAndRankedTags.value.filter((tag) =>
    ['image', 'iframe', 'video'].includes(tag.parsed.type)
  )
})

const splitTextTags = computed(() => {
  return filteredAndRankedTags.value.filter((tag) =>
    !['image', 'iframe', 'video'].includes(tag.parsed.type)
  )
})

const splitImageTotalPages = computed(() =>
  Math.max(1, Math.ceil(splitImageTags.value.length / pageSizeState.value))
)

const splitTextTotalPages = computed(() =>
  Math.max(1, Math.ceil(splitTextTags.value.length / pageSizeState.value))
)

const splitImagePaginated = computed(() => {
  const start = (splitImagePage.value - 1) * pageSizeState.value
  return splitImageTags.value.slice(start, start + pageSizeState.value)
})

const splitTextPaginated = computed(() => {
  const start = (splitTextPage.value - 1) * pageSizeState.value
  return splitTextTags.value.slice(start, start + pageSizeState.value)
})

function handleAddInputKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleAddTag()
  }
}

function handleAddTag() {
  if (!newTagName.value.trim()) return
  addTag(newTagName.value)
  newTagName.value = ''
  showToast('Added')
}

function triggerImport() {
  fileInput.value?.click()
}

function handleExport() {
  exportTagsToFile()
  showToast('Exported')
}

function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      importTagsFromFileContent(reader.result)
      showToast('Imported')
    } catch (error) {
      console.error(error)
      showToast('Import failed')
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}

function openEditModal(tag) {
  editingTag.value = tag
  editOpen.value = true
}

function closeEditModal() {
  editOpen.value = false
  editingTag.value = null
}

function saveEditModal(value) {
  if (!editingTag.value) return
  editTag(editingTag.value.id, value)
  closeEditModal()
  showToast('Updated')
}

function handleDeleteTag(id) {
  if (!window.confirm('Delete this tag?')) return
  deleteTag(id)
  showToast('Deleted')
}

function handleFindTag(value) {
  searchImmediate.value = value
  search.value = value
  currentPage.value = 1
  splitImagePage.value = 1
  splitTextPage.value = 1
  showToast('Search filled')
}

function handleToggleHide(id) {
  toggleHideTag(id)
  showToast('Visibility changed')
}

function handleToggleStrike(id) {
  toggleStrikeTag(id)
  showToast('Strike changed')
}

async function handleCopyAllJson() {
  await copyAllJson()
  showToast('JSON copied')
}

function handlePageSizeChange(event) {
  setPageSize(Number(event.target.value))
}

function handleImgSizeChange(event) {
  setImgSizeMode(event.target.value)
}

function handleBodyWidthChange(event) {
  setBodyWidthMode(event.target.value)
}

function prevPage() {
  if (currentPage.value > 1) currentPage.value -= 1
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value += 1
}

function undoAndToast() {
  undo()
  showToast('Undo')
}

function reverseAndToast() {
  reverseTags()
  showToast('Reversed')
}

function randomizeAndToast() {
  randomizeTags()
  showToast('Randomized')
}

function sortAndToast() {
  sortByLength()
  showToast('Sorted by length')
}

function duplicatesAndToast() {
  removeDuplicates()
  showToast('Duplicates removed')
}

function exportImagesAndToast() {
  exportImageTags()
  showToast('Image tags exported')
}

function clearAllAndToast() {
  if (!window.confirm('Clear all content? This cannot be undone.')) return
  clearAllTags()
  newTagName.value = ''
  searchImmediate.value = ''
  search.value = ''
  currentPage.value = 1
  splitImagePage.value = 1
  splitTextPage.value = 1
  showToast('Cleared')
}

function toggleShowHidden() {
  showHidden.value = !showHidden.value
}

function showToast(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 1600)
}
</script>

<style scoped>
.section {
  padding: 32px 0 48px;
}

.container {
  width: calc(100vw - 32px);
  margin: 0 auto;
}

.container-narrow {
  max-width: 960px;
}

.container-default {
  max-width: 1280px;
}

.container-wide {
  max-width: 1600px;
}

.container-full {
  max-width: 100%;
}

.hero-lite {
  padding-top: 24px;
}

.hero-panel {
  display: grid;
  gap: 24px;
  background: linear-gradient(135deg, #f8f5ef 0%, #ffffff 100%);
  border-radius: 28px;
  padding: 28px;
  box-shadow: 0 18px 50px rgba(17, 17, 17, 0.06);
}



.stats-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.stat-card {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 22px;
  padding: 18px;
  border: 1px solid rgba(17, 17, 17, 0.06);
}

.stat-label {
  display: block;
  font-size: 0.85rem;
  color: #666;
}

.stat-value {
  display: block;
  margin-top: 8px;
  font-size: clamp(1.4rem, 3vw, 2.2rem);
}

.toolbar {
  display: grid;
  gap: 14px;
  margin-bottom: 18px;
}

.toolbar-input {
  width: 100%;
  resize: vertical;
  min-height: 120px;
  border-radius: 24px;
  border: 1px solid rgba(17, 17, 17, 0.12);
  background: #fff;
  padding: 16px 18px;
  font: inherit;
  line-height: 1.7;
  box-shadow: 0 10px 30px rgba(17, 17, 17, 0.04);
}

.toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.second-row {
  align-items: center;
}

.toolbar-btn {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(17, 17, 17, 0.12);
  background: #fff;
  color: #111;
  font: inherit;
  cursor: pointer;
}

.toolbar-btn.primary {
  background: #111;
  color: #fff;
  border-color: #111;
}

.toolbar-search,
.page-size-select {
  min-height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(17, 17, 17, 0.12);
  background: #fff;
  padding: 0 14px;
  font: inherit;
}

.toolbar-search {
  min-width: min(460px, 100%);
  flex: 1 1 360px;
}

.hidden-file-input {
  display: none;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  color: #666;
  font-size: 0.94rem;
  margin-bottom: 16px;
}

.result-separator {
  opacity: 0.45;
}

.mag-grid {
  display: grid;
  gap: 18px;
  align-items: start;
}

.mag-grid > * {
  min-width: 0;
}

.mag-grid.grid-list {
  grid-template-columns: minmax(0, 1fr);
}

.mag-grid.grid-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.mag-grid.grid-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.mag-grid.grid-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.split-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}

.split-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.pagination-bar {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.pagination-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-indicator {
  color: #666;
}

.snackbar {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  padding: 12px 18px;
  background: #111;
  color: #fff;
  border-radius: 999px;
  z-index: 9999;
  opacity: 0;
  pointer-events: none;
  transition: 0.25s ease;
}

.snackbar.show {
  opacity: 1;
}

@media (max-width: 1100px) {
  .stats-grid,
  .mag-grid.grid-4,
  .mag-grid.grid-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .split-wrap,
  .mag-grid.grid-2,
  .mag-grid.grid-3,
  .mag-grid.grid-4,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .container {
    width: calc(100vw - 20px);
  }

  .hero-panel {
    padding: 22px;
  }
}
</style>