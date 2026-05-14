<template>
  <div class="filter-bar">
    <div class="filter-group search-group">
      <label class="filter-label" for="search">Search</label>
      <input
        id="search"
        :value="search"
        type="text"
        class="filter-input"
        placeholder="Search tags, types, titles..."
        @input="$emit('update:search', $event.target.value)"
      />
    </div>

    <div class="filter-group">
      <label class="filter-label" for="type">Type</label>
      <select
        id="type"
        :value="type"
        class="filter-select"
        @change="$emit('update:type', $event.target.value)"
      >
        <option value="all">All</option>
        <option value="text">Text</option>
        <option value="image">Image</option>
        <option value="youtube">YouTube</option>
        <option value="raw-html">Raw HTML</option>
      </select>
    </div>
  </div>
</template>

<script setup>
defineProps({
  search: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'all'
  }
})

defineEmits(['update:search', 'update:type'])
</script>