import { computed, reactive, ref } from 'vue'
import { useNav } from '@slidev/client'

// Every node on the hub map. Main points form the trunk, a horizontal line 45% of the way down (left to
// right, in talk order), with their names above; each main point's sub-sections hang below it on circuit-board
// branches that zigzag down at 45 degrees, ending at different depths. Some sub-sections are optional (skip them
// if short of time).
// `alias` is the `routeAlias` in the frontmatter of the topic's first slide.
// `x`, `y` place the node on the hub, in slide pixels (the slide is 980 x 552); a sub-section's are worked out
// from its `moves`.
export interface Topic {
  id: string
  title: string
  teaser: string
  kind: 'core' | 'sub'
  optional?: boolean
  // A smaller main point: the opening, the pause in the middle and the close, around the two main parts of the talk.
  minor?: boolean
  alias: string
  x: number
  y: number
  parent?: string
  // Sub-sections only: the branch from the main point's centre to the node, as moves [dx, dy] in slide pixels,
  // each straight down (dx 0), straight across (dy 0) or at 45 degrees (|dx| = dy). Branches of one main point share their first moves,
  // like a staircase that each node hangs from.
  moves?: [number, number][]
  minutes?: number
}

export const TRUNK_Y = 248
// The main points are spaced evenly along the line, from Introduction to Wrap-up.

const CORE: Topic[] = [
  // The trunk: the talk, in order.
  { id: 'intro', kind: 'core', minor: true, alias: 'intro', x: 130, y: TRUNK_Y, minutes: 3,
    title: 'Introduction', teaser: 'Have you heard of AI? What I use, and the elephant' },
  { id: 'claude-code', kind: 'core', alias: 'claude-code', x: 318, y: TRUNK_Y, minutes: 10,
    title: 'Claude Code', teaser: 'Still a chat, but one that can work on your computer' },
  { id: 'interlude', kind: 'core', minor: true, alias: 'interlude', x: 505, y: TRUNK_Y, minutes: 5,
    title: 'Interlude', teaser: "Am I still coding? Why we code, the fundamentals, and a chef" },
  { id: 'beyond', kind: 'core', alias: 'beyond', x: 693, y: TRUNK_Y, minutes: 10,
    title: 'Beyond Coding', teaser: 'The rest of the job beyond the code, and learning' },
  { id: 'close', kind: 'core', minor: true, alias: 'close', x: 880, y: TRUNK_Y, minutes: 2,
    title: 'Wrap-up', teaser: 'Coding ≠ Typing, one more time. Then your questions' },
]

// The branches: sub-sections, left to right in talk order below their main point. Only one main point's
// sub-sections show at a time; within a group, the moves are chosen so that no branch crosses another's label.
// Claude Code grows two limbs: Wordle Demo zigzagging down to the left, and one that splits three ways (Context and
// Memory, MCP, Skills); just before that split, A Team of Agents branches off straight across to the right.
const SUBS: Omit<Topic, 'x' | 'y'>[] = [
  { id: 'wordle', kind: 'sub', alias: 'wordle', parent: 'claude-code',
    moves: [[0, 30], [-100, 100], [0, 10], [-60, 60], [0, 40]],
    title: 'Wordle Demo', teaser: 'Live demo asking Claude to construct a game' },
  { id: 'memory', kind: 'sub', alias: 'memory', parent: 'claude-code',
    moves: [[0, 30], [40, 40], [0, 60], [-40, 40], [0, 50]],
    title: 'Context and Memory', teaser: 'Claude remembers nothing, so we leave it a note: CLAUDE.md' },
  { id: 'mcp', kind: 'sub', alias: 'mcp', parent: 'claude-code',
    moves: [[0, 30], [40, 40], [0, 60], [0, 40]],
    title: 'MCP', teaser: 'Claude driving apps: Blender, and Couch, a page only Claude can change' },
  { id: 'skills', kind: 'sub', alias: 'skills', parent: 'claude-code',
    moves: [[0, 30], [40, 40], [0, 60], [60, 60], [0, 40]],
    title: 'Skills', teaser: 'Teaching Claude a skill that can be used again and again' },
  { id: 'agents', kind: 'sub', alias: 'agents', parent: 'claude-code',
    moves: [[0, 30], [40, 40], [0, 30], [180, 0], [0, 80]],
    title: 'A Team of Agents', teaser: 'Several Claude sessions, each with its own job, working together' },
  // Beyond Coding: the rest of the job. A limb to the left (Source Control branches off straight across, then
  // Testing), Monitoring straight down, and a limb to the right (Documentation, then Learning branching off
  // straight across).
  { id: 'source-control', kind: 'sub', alias: 'source-control', parent: 'beyond',
    moves: [[0, 30], [-80, 80], [-150, 0], [0, 40]],
    title: 'Source Control', teaser: 'Save points for your work, and many people changing one project' },
  { id: 'testing', kind: 'sub', alias: 'testing', parent: 'beyond',
    moves: [[0, 30], [-80, 80], [0, 10], [-40, 40], [0, 40]],
    title: 'Testing', teaser: 'Small programs that check the real program still works' },
  { id: 'monitoring', kind: 'sub', alias: 'monitoring', parent: 'beyond',
    moves: [[0, 60], [20, 20], [0, 50]],
    title: 'Monitoring', teaser: 'Reading what a running app writes about itself' },
  { id: 'documentation', kind: 'sub', alias: 'documentation', parent: 'beyond',
    moves: [[0, 30], [90, 90], [0, 20], [30, 30], [0, 40]],
    title: 'Documentation', teaser: 'The team handbook, the to-do list, and notes on what changed and why' },
  { id: 'learning', kind: 'sub', alias: 'learning', parent: 'beyond',
    moves: [[0, 30], [90, 90], [140, 0], [0, 40]],
    title: 'Learning', teaser: 'Start from what you want to know, then fill in the gaps' },
]

// How much the branches are stretched to fill the space below the line: every 45-degree step after a branch's first
// gets a straight sideways run after it (SPREAD times as wide), and each straight drop is DROP_SCALE times as long.
// The first step stays as it is, so branches that share it (a limb) still share it.
const SPREAD = 1.6
const DROP_SCALE = 1.0

// The corners of a branch, from its main point's centre to its node.
function corners(s: Omit<Topic, 'x' | 'y'>): [number, number][] {
  const parent = CORE.find(c => c.id === s.parent)!
  const pts: [number, number][] = [[parent.x, parent.y]]
  let steps = 0
  for (const [dx, dy] of s.moves ?? []) {
    const [x, y] = pts.at(-1)!
    if (dx === 0) { pts.push([x, y + dy * DROP_SCALE]); continue }
    if (dy === 0) { pts.push([x + dx, y]); continue }
    pts.push([x + dx, y + dy])
    if (steps++ > 0) pts.push([x + dx * SPREAD, y + dy])
  }
  return pts
}

export const TOPICS: Topic[] = [
  ...CORE,
  ...SUBS.map(s => { const end = corners(s).at(-1)!; return { ...s, x: end[0], y: end[1] } }),
]

// A branch grows out of the centre of its main point and zigzags down to its node (circuit-board style).
export function branchPath(t: Topic) {
  return corners(t).map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ')
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
