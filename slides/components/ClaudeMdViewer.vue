<script setup lang="ts">
import DocViewer from './DocViewer.vue'
// Real CLAUDE.md files from Daniel's folders, read at build time. Copied into the repo because CI only has this
// repo; copy them again when the originals change:
//   asset-librarian: ~/repos/assets/HumbleBundleRPG/RPG Asset Mega Bundle/CLAUDE.md (Claude as librarian of
//     a folder of RPG game art, for the Coding RPG game)
//   books: ~/books/CLAUDE.md (a catalogue of Daniel's ebooks; not code at all)
import librarian from '../examples/asset-librarian/CLAUDE.md?raw'
import books from '../examples/books/CLAUDE.md?raw'

const props = withDefaults(defineProps<{ which?: 'asset-librarian' | 'books' }>(), { which: 'asset-librarian' })

const DOCS = {
  'asset-librarian': {
    text: librarian,
    filename: 'RPG Asset Mega Bundle / CLAUDE.md',
    caption: 'The note in my folder of game art: Claude as its librarian',
    sections: [
      { label: 'What it is', from: (l: string) => l.startsWith('# ') },
      { label: 'The rules', from: (l: string) => l === '## Rules' },
      { label: 'Where things are', from: (l: string) => l === '## Layout' },
    ],
  },
  'books': {
    text: books,
    filename: 'books / CLAUDE.md',
    caption: 'The note in my folder of ebooks: no code at all',
    sections: [
      { label: 'What it is', from: (l: string) => l.startsWith('# ') },
      { label: 'The catalogue', from: (l: string) => l.startsWith('## Catalogue') },
      { label: 'Notes for Claude', from: (l: string) => l === '## Notes for Claude' },
    ],
  },
}
const doc = DOCS[props.which]
</script>

<template>
  <DocViewer :text="doc.text" :filename="doc.filename" :sections="doc.sections" :caption="doc.caption" />
</template>
