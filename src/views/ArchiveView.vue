<template>
  <main class="section">
    <div class="container">
      <div class="section-head archive-head">
        <div>
          <div class="eyebrow">Editorial Archive</div>
          <h1 class="section-title">Raw Data Notes</h1>
        </div>
        <div class="archive-head-note">
          保留原始輸入，方便檢查資料來源與安全清洗結果。
        </div>
      </div>

      <div class="archive-grid">
        <ArchiveItem
          v-for="tag in parsedTags"
          :key="tag.id"
          :tag="tag"
        />
      </div>
    </div>
  </main>
</template>

<script setup>
import ArchiveItem from '../components/ArchiveItem.vue'
import { useSanitizedTags } from '../composables/useSanitizedTags'

const { parsedTags } = useSanitizedTags()
</script>