import type { NavOperations, ShortcutOptions } from '@slidev/types'
import { defineShortcutsSetup } from '@slidev/types'
import { useNav } from '@slidev/client'
import { chainOf, deadEnd, deadEndAt, lastClicks, lastSlideNo, TALK_ORDER, useTopicSlides, visited } from '../topics'
import { nextTheme, panelOpen } from '../theme'

// A main point and its sub-sections form one chain (e.g. Claude Code → Wordle → Context and Memory → Skills).
// The arrow keys run along the chain and never leave it:
// - Forward past a page's last slide goes to the next page in the chain; back from its first slide goes to the
//   previous page's last slide.
// - At either end of the chain the keys do nothing; the Map button pulses instead, so you know you've reached it.
// - The map is only reached on purpose: H, or the Map button.
// - On the map, → opens the next part of the talk you haven't visited yet (main points and their
//   sub-sections, in order; optional sub-sections are skipped),
//   and ← goes back to the slide you came from (undoing an accidental H).
export default defineShortcutsSetup((nav: NavOperations, base: ShortcutOptions[]) => {
  const { clicks, clicksStart, clicksTotal, currentSlideNo, currentSlideRoute } = useNav()
  const { ranges } = useTopicSlides()
  const go = nav.go as (no: number | string, clicks?: number) => void

  const onHub = () => currentSlideRoute.value?.meta.slide?.frontmatter.routeAlias === 'hub'
  const section = () => ranges.value.find(r => currentSlideNo.value >= r.no && currentSlideNo.value <= r.end)

  function forward(step: () => void, wholeSlide: boolean) {
    return () => {
      if (onHub()) {
        const next = TALK_ORDER.find(t => !visited.has(t.id))
        if (next) go(next.alias)
        return
      }
      const s = section()
      const lastClick = wholeSlide || clicks.value >= clicksTotal.value
      if (s && currentSlideNo.value === s.end && lastClick) {
        const chain = chainOf(s.id)
        const next = chain[chain.findIndex(t => t.id === s.id) + 1]
        if (next) return go(next.alias)
        deadEndAt.value = 'end'; deadEnd.value++; return
      }
      step()
    }
  }

  function backward(step: () => void, wholeSlide: boolean) {
    return () => {
      if (onHub() && lastSlideNo.value) return go(lastSlideNo.value, lastClicks.value)
      const s = section()
      const firstClick = wholeSlide || clicks.value <= clicksStart.value
      if (s && currentSlideNo.value === s.no && firstClick) {
        const chain = chainOf(s.id)
        const prev = chain[chain.findIndex(t => t.id === s.id) - 1]
        const prevEnd = prev && ranges.value.find(r => r.id === prev.id)?.end
        if (prevEnd) return go(prevEnd)
        deadEndAt.value = 'start'; deadEnd.value++; return
      }
      step()
    }
  }

  const replace: Record<string, () => void> = {
    next_space: forward(nav.next, false),
    next_right: forward(nav.next, false),
    next_page_key: forward(nav.next, false),
    next_down: forward(nav.nextSlide, true),
    next_shift: forward(nav.nextSlide, true),
    prev_space: backward(nav.prev, false),
    prev_left: backward(nav.prev, false),
    prev_page_key: backward(nav.prev, false),
    prev_up: backward(nav.prevSlide, true),
    prev_shift: backward(nav.prevSlide, true),
  }

  return [
    ...base.map(s => (s.name && replace[s.name] ? { ...s, fn: replace[s.name] } : s)),
    { name: 'go_hub', key: 'h', fn: () => go('hub') },
    { name: 'next_theme', key: 't', fn: nextTheme },
    { name: 'colour_panel', key: 'c', fn: () => { panelOpen.value = !panelOpen.value } },
  ]
})
