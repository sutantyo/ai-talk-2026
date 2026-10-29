import { computed, reactive, ref } from 'vue'
import { useNav } from '@slidev/client'

// Every node on the hub tree. Main points form the trunk (top to bottom, in talk order);
// sub-sections branch off the main point they belong to. Some sub-sections are optional (skip them if short of time).
// `alias` is the `routeAlias` in the frontmatter of the topic's first slide.
// `x`, `y` place the node on the hub, in slide pixels (the slide is 980 x 552).
export interface Topic {
  id: string
  title: string
  teaser: string
  kind: 'core' | 'sub'
  optional?: boolean
  alias: string
  x: number
  y: number
  parent?: string
  // Sub-sections only: how far above (negative) or below (positive) the main point the branch runs sideways.
  run?: number
  minutes?: number
}

export const TRUNK_X = 490
export const ROOT_Y = 26

export const TOPICS: Topic[] = [
  // The trunk: the talk, in order.
  { id: 'intro', kind: 'core', alias: 'intro', x: TRUNK_X, y: 85, minutes: 3,
    title: 'Introduction', teaser: 'Have you heard of AI? What I use, and the elephant' },
  { id: 'claude-code', kind: 'core', alias: 'claude-code', x: TRUNK_X, y: 200, minutes: 10,
    title: 'Claude Code', teaser: 'Still a chat, but one that can work on your computer' },
  { id: 'beyond', kind: 'core', alias: 'beyond', x: TRUNK_X, y: 360, minutes: 10,
    title: 'Beyond Coding', teaser: 'So am I still coding? The rest of the job, learning, and AI driving other apps' },
  { id: 'close', kind: 'core', alias: 'close', x: TRUNK_X, y: 475, minutes: 2,
    title: 'Wrap-up', teaser: 'Coding ≠ Typing, one more time. Then your questions' },

  // The branches: sub-sections, laid out left to right in talk order, scattered above and below their main point.
  // Claude Code's sub-sections are the bulk of the talk.
  { id: 'wordle', kind: 'sub', alias: 'wordle', parent: 'claude-code', x: 150, y: 127, run: -30,
    title: 'Wordle', teaser: 'Live demo asking Claude to construct a game' },
  { id: 'memory', kind: 'sub', alias: 'memory', parent: 'claude-code', x: 320, y: 277, run: 30,
    title: 'Context and Memory', teaser: 'Claude remembers nothing, so we leave it a note: CLAUDE.md' },
  { id: 'skills', kind: 'sub', alias: 'skills', parent: 'claude-code', x: 700, y: 262, run: 30,
    title: 'Skills', teaser: 'Teaching Claude a skill that can be used again and again' },
  // Beyond Coding
  { id: 'not-just-coding', kind: 'sub', alias: 'not-just-coding', parent: 'beyond', x: 200, y: 284, run: -30,
    title: 'Coding is not just coding', teaser: 'Coding-related tasks' },
  { id: 'learning', kind: 'sub', optional: true, alias: 'learning', parent: 'beyond', x: 330, y: 444, run: 30,
    title: 'Learning with AI', teaser: 'Start from what you want to know, then fill in the gaps' },
  { id: 'mcp', kind: 'sub', optional: true, alias: 'mcp', parent: 'beyond', x: 800, y: 284, run: -30,
    title: 'MCP (Blender)', teaser: 'Claude driving an app' },
]

// Default distance between a main point and the line its branch runs along (below it), clear of its label.
export const BRANCH_OFFSET = 30

const runOf = (t: Topic) => t.run ?? BRANCH_OFFSET

// A branch grows out of the centre of its main point: 45 degrees out (up or down) to its run line,
// sideways, then 45 degrees (up or down) into the sub-section's node (circuit-board style).
export function branchPath(t: Topic) {
  const parent = TOPICS.find(p => p.id === t.parent)!
  const side = t.x > TRUNK_X ? 1 : -1
  const run = runOf(t)
  const runY = parent.y + run
  const rise = Math.abs(t.y - runY)
  return `M ${TRUNK_X} ${parent.y} L ${TRUNK_X + side * Math.abs(run)} ${runY} H ${t.x - side * rise} L ${t.x} ${t.y}`
}

// A sub-section's label goes on the side of its node away from the incoming trace.
export function labelAbove(t: Topic) {
  const parent = TOPICS.find(p => p.id === t.parent)!
  return t.y < parent.y + runOf(t)
}

// The talk in order: each main point, then its sub-sections that aren't optional.
// → on the map walks this list.
export const TALK_ORDER: Topic[] = TOPICS.filter(t => t.kind === 'core')
  .flatMap(c => [c, ...TOPICS.filter(t => t.parent === c.id && !t.optional)])

// A main point and all its sub-sections (optional ones included), in order: the arrow keys run through this chain.
export function chainOf(id: string): Topic[] {
  const t = TOPICS.find(x => x.id === id)
  if (!t) return []
  const core = t.parent ?? t.id
  return [TOPICS.find(x => x.id === core)!, ...TOPICS.filter(x => x.parent === core)]
}

// --- What's been visited (shared by the hub and the back-to-hub button) ----------------------

export const visited = reactive(new Set<string>())
export const lastTopic = ref<string | null>(null)
// The last slide shown before the map, so ← on the map can go back to it.
export const lastSlideNo = ref<number | null>(null)
export const lastClicks = ref(0)
// Goes up by one each time the keys hit the end (or start) of a section; the Map button reacts to it.
export const deadEnd = ref(0)
export const deadEndAt = ref<'start' | 'end'>('end')

// For each topic: its first slide number, and how many slides it has.
// A topic runs from its first slide up to the next topic's first slide.
export function useTopicSlides() {
  const { slides, currentSlideNo } = useNav()

  const ranges = computed(() => {
    const starts = TOPICS
      .map(t => ({ id: t.id, no: slides.value.find(s => s.meta.slide?.frontmatter.routeAlias === t.alias)?.no }))
      .filter((s): s is { id: string, no: number } => s.no !== undefined)
      .sort((a, b) => a.no - b.no)
    const hubNo = slides.value.find(s => s.meta.slide?.frontmatter.routeAlias === 'hub')?.no
    return starts.map((s, i) => {
      let end = (starts[i + 1]?.no ?? slides.value.length + 1) - 1
      if (hubNo && hubNo > s.no && hubNo <= end) end = hubNo - 1
      return { ...s, count: end - s.no + 1, end }
    })
  })

  const currentTopic = computed(() =>
    ranges.value.find(r => currentSlideNo.value >= r.no && currentSlideNo.value <= r.end)?.id ?? null)

  return { ranges, currentTopic }
}
