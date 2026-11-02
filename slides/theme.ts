import { ref, watch } from 'vue'

// Colour themes. Every colour lives in style.css as a named variable; a theme is a set of values for those names,
// chosen by data-theme on <html>. T or the theme button (global-top.vue) switches to the next one.
// The choice is remembered in the browser, and the presenter and audience windows follow each other.
export const THEMES = [
  { id: 'indigo', name: 'Indigo' },     // dark indigo with yellow: the default
  { id: 'pastel', name: 'Pastel' },     // cream, soft cyan and soft orange, brown-orange text (the :root values in style.css)
] as const
export type ThemeId = typeof THEMES[number]['id']

const KEY = 'deck-theme'
const known = (v: unknown): v is ThemeId => THEMES.some(t => t.id === v)

function saved(): ThemeId {
  try {
    const v = localStorage.getItem(KEY)
    return known(v) ? v : 'indigo'
  } catch {
    return 'indigo'
  }
}

export const theme = ref<ThemeId>(typeof window === 'undefined' ? 'indigo' : saved())

export function nextTheme() {
  const i = THEMES.findIndex(t => t.id === theme.value)
  theme.value = THEMES[(i + 1) % THEMES.length].id
}

if (typeof window !== 'undefined') {
  watch(theme, t => {
    document.documentElement.dataset.theme = t
    try { localStorage.setItem(KEY, t) } catch { /* not remembered, but it still switches */ }
  }, { immediate: true })
  // Another window of the deck (e.g. the presenter view) switched theme.
  window.addEventListener('storage', e => { if (e.key === KEY && known(e.newValue)) theme.value = e.newValue })
}

// The colour panel (ColourPanel.vue, key C): the numbers behind each theme (style.css), changed live and
// remembered in the browser. They're set on <html>, so they override the defaults in style.css.
type Tuning = { id: string, label: string, min: number, max: number, step: number, value: number }
export const TUNINGS: Record<ThemeId, Tuning[]> = {
  pastel: [
    { id: 'px-l', label: 'Background lightness', min: 0.85, max: 1, step: 0.005, value: 0.95 },
    { id: 'px-h', label: 'Background hue (90 cream, 60 peach, 200 cyan)', min: 0, max: 360, step: 1, value: 92 },
    { id: 'px-c', label: 'Background colourfulness', min: 0, max: 0.08, step: 0.002, value: 0.026 },
    { id: 'px-sub', label: 'Main accent hue (207 cyan)', min: 0, max: 360, step: 1, value: 207 },
    { id: 'px-core', label: 'Main points hue (58 orange)', min: 0, max: 360, step: 1, value: 58 },
    { id: 'px-text', label: 'Text hue (55 brown-orange)', min: 0, max: 360, step: 1, value: 55 },
  ],
  indigo: [
    { id: 'ix-l', label: 'Background lightness', min: 0.1, max: 0.4, step: 0.005, value: 0.125 },
    { id: 'ix-h', label: 'Background hue (lower = greener)', min: 150, max: 300, step: 1, value: 235 },
    { id: 'ix-c', label: 'Background colourfulness', min: 0, max: 0.16, step: 0.005, value: 0.09 },
    { id: 'ix-sub', label: 'Main accent hue (85 yellow, 125 green)', min: 20, max: 200, step: 1, value: 85 },
    { id: 'ix-core', label: 'Main points hue', min: 0, max: 360, step: 1, value: 275 },
  ],
}
// Renamed when the defaults change, so values saved while trying out the old ones don't hide the new ones.
const TUNE_KEY = 'deck-tuning-2'
const defaults = () => Object.fromEntries(Object.values(TUNINGS).flat().map(t => [t.id, t.value])) as Record<string, number>

function savedTuning(): Record<string, number> {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem(TUNE_KEY) ?? '{}') } } catch { return defaults() }
}

export const tuning = ref(typeof window === 'undefined' ? defaults() : savedTuning())
export const panelOpen = ref(false)

if (typeof window !== 'undefined') {
  watch(tuning, v => {
    for (const [id, value] of Object.entries(v)) document.documentElement.style.setProperty(`--${id}`, String(value))
    try { localStorage.setItem(TUNE_KEY, JSON.stringify(v)) } catch { /* still applied */ }
  }, { immediate: true, deep: true })
  window.addEventListener('storage', e => {
    if (e.key === TUNE_KEY && e.newValue) try { tuning.value = JSON.parse(e.newValue) } catch { /* ignore */ }
  })
}
