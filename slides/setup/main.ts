import { defineAppSetup } from '@slidev/types'
// @ts-expect-error Slidev's virtual module: the deck's slides, the same list useNav() reads
import { slides } from '#slidev/slides'
import '../theme' // sets the colour theme on <html> before the first slide shows

// Slides slide within a section, but any move to or from the map fades (see style.css).
// Slidev can't do this from frontmatter alone: going forward it uses the transition of the slide just before the
// destination in deck order, not the slide you came from, so a jump from the map would slide.
// Instead, each move that touches the map is marked on <html>, and the CSS turns that slide into a fade.
export default defineAppSetup(({ router }) => {
  const isHub = (no: unknown) =>
    no === 'hub' || slides.value.find((s: any) => s.no === Number(no))?.meta.slide?.frontmatter.routeAlias === 'hub'

  router.beforeEach((to, from) => {
    document.documentElement.toggleAttribute('data-map-move', isHub(to.params.no) || isHub(from.params.no))
  })
})
