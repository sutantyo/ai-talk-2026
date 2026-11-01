<script setup lang="ts">
import DocViewer from './DocViewer.vue'
// Couch's add-to-couch skill (mcp-demo/.claude/skills/add-to-couch/SKILL.md), read at build time, so the slide always
// shows the current version.
import raw from '../../mcp-demo/.claude/skills/add-to-couch/SKILL.md?raw'

const sections = [
  { label: 'The description', from: (l: string) => l === '---' },
  { label: 'Check first', from: (l: string) => l.startsWith('## 1.') },
  { label: 'Ask me first', from: (l: string) => l.startsWith('## 2.') },
]
</script>

<template>
  <DocViewer :text="raw" filename="add-to-couch / SKILL.md" :sections="sections" caption="A skill for Couch" />
</template>
