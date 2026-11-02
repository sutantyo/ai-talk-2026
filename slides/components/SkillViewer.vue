<script setup lang="ts">
import DocViewer from './DocViewer.vue'
// Real skills, read at build time.
//   add-to-couch: Couch's skill, straight from mcp-demo/.claude/skills/ (in this repo, so always current).
//   organise-books: from Daniel's ebook folder (~/books/.claude/skills/organise-books/SKILL.md), copied into
//     examples/ because CI only has this repo; copy it again when the original changes.
import couch from '../../mcp-demo/.claude/skills/add-to-couch/SKILL.md?raw'
import books from '../examples/books/organise-books/SKILL.md?raw'

const props = withDefaults(defineProps<{ which?: 'add-to-couch' | 'organise-books' }>(), { which: 'add-to-couch' })

const DOCS = {
  'add-to-couch': {
    text: couch,
    filename: 'add-to-couch / SKILL.md',
    caption: 'A skill for Couch',
    sections: [
      { label: 'The description', from: (l: string) => l === '---' },
      { label: 'Check first', from: (l: string) => l.startsWith('## 1.') },
      { label: 'Ask me first', from: (l: string) => l.startsWith('## 2.') },
    ],
  },
  'organise-books': {
    text: books,
    filename: 'organise-books / SKILL.md',
    caption: 'A skill for my ebook folder',
    sections: [
      { label: 'The description', from: (l: string) => l === '---' },
      { label: 'Clean names', from: (l: string) => l.startsWith('## 3.') },
      { label: 'Ask me first', from: (l: string) => l.startsWith('## 4.') },
    ],
  },
}
const doc = DOCS[props.which]
</script>

<template>
  <DocViewer :text="doc.text" :filename="doc.filename" :sections="doc.sections" :caption="doc.caption" />
</template>
