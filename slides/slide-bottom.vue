<script setup lang="ts">
// Drawn underneath each slide (not the whole page), so each slide keeps its own background during a transition.
// Every slide, the map included, has the same background: the theme's --bg (style.css).
</script>

<template>
  <div class="slide-bg" />
</template>

<style scoped>
/* z-index -1: behind every part of the slide, positioned or not, but still above the page. */
.slide-bg { position: absolute; inset: 0; z-index: -1; background: var(--bg); pointer-events: none; }
</style>
