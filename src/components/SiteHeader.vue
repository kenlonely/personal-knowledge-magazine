<template>
  <header class="topbar">
    <div class="container topbar-inner">
      <RouterLink to="/" class="brand-link">
        <div class="brand">Knowledge Edit</div>
      </RouterLink>

      <nav class="nav">
        <RouterLink to="/" class="nav-link">Home</RouterLink>
        <RouterLink to="/archive" class="nav-link">Archive</RouterLink>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>