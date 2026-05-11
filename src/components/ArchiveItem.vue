<template>
  <div class="archive-item">
    <div class="card-kicker">Source</div>
    <div class="archive-title">{{ tag.parsed.displayTitle }}</div>
    <div class="archive-meta">
      <span class="badge">{{ tag.parsed.type }}</span>
    </div>
    <p class="archive-raw">{{ tag.name }}</p>
  </div>
</template>

<script setup>
defineProps({
  tag: {
    type: Object,
    required: true
  }
})
</script>