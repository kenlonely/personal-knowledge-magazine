<!-- <template>
  <section class="hero">
    <div class="container hero-grid">
      <div class="hero-main">
        <div>
          <div class="eyebrow">Fashion Magazine Knowledge System</div>
          <h1 class="hero-title">
            Curated Mind,<br />
            Styled Life
          </h1>
          <p class="hero-desc">
            以 editorial / fashion magazine 視覺語言打造的個人知識管理網站，
            用來整理標籤、靈感、內容收藏與個人資料庫。所有輸入資料預設經過安全清洗，
            避免直接插入危險 HTML。
          </p>
        </div>

        <div class="hero-badges">
          <span class="badge">Exported: {{ stats.exportedAtFormatted }}</span>
          <span class="badge">Total Tags: {{ stats.totalTags }}</span>
        </div>
      </div>

      <div class="hero-side">
        <div class="mini-panel">
          <div class="eyebrow">Overview</div>
          <div class="mini-line">Text: {{ stats.textCount }}</div>
          <div class="mini-line">Image: {{ stats.imageCount }}</div>
          <div class="mini-line">YouTube: {{ stats.youtubeCount }}</div>
          <div class="mini-line">Unsafe HTML: {{ stats.rawHtmlCount }}</div>
        </div>

        <div class="mini-panel quote-panel">
          <div class="eyebrow">Editorial Note</div>
          <p>
            A personal archive should feel as intentional as a magazine spread:
            sharp, calm, curated, and safe.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  stats: {
    type: Object,
    required: true
  }
})
</script> -->