# CLAUDE.md

Context for Claude sessions working in this repo: Daniel's talk on how he uses Claude day to day as a
software engineer. The deck is built and live; every slide has content, and what's left is a few visuals, real
examples from his work, and rehearsing the live demos (open questions at the end). The original design is in
`docs/superpowers/specs/2026-10-06-coding-not-typing-design.md`; later decisions below supersede it.

## Repo

Public repo `sutantyo/ai-talk-2026` (renamed from `ai-essentials-interactive` on 2026-10-07). Live at
https://sutantyo.github.io/ai-talk-2026/.

Everything for the talk lives under one parent folder (a plain folder, not a repo); on Daniel's MacBook,
the one he presents from, that's `~/repos/uni/2026-ai-talk/`:

```
2026-ai-talk/
├── slides/                     this repo (sutantyo/ai-talk-2026): the deck, the spec, this file
├── japanese-phrasebook-demo/   sutantyo/japanese-phrasebook-demo: the old skills demo (dropped 2026-11-02)
├── blender/                    the MCP demo: its own .mcp.json with a Blender MCP, plus pre-built Python scripts
└── wordle-demo/                only words.js: ANSWERS and ALLOWED word lists for 4 to 7 letters (about 1 MB)
```

Wordle is built live on stage; `wordle-demo/` holds only the prepared word lists (keep anything else out: Claude
reads what's in the folder). `words.js` (2026-10-08): `ANSWERS[n]` are common words (Google's 10,000 most common, no
swears, names/places/brands removed: about 1,000 to 1,300 per length), `ALLOWED[n]` the dwyl/english-words
dictionary (7,186 to 41,998 per length). The answer lists are wrapped for editing; a header comment explains it.

| Path | What it is |
|---|---|
| `mcp-demo/` | **A separate project** (2026-11-01): Couch, a YouTube page changed only through MCP; the second MCP example. It has its own `CLAUDE.md`; when working on the deck, leave it alone and don't act on its notes |
| `coding-rpg-demo/` | A browser game where every battle is a programming question (plain HTML/JS, its own `README.md`). Not in the deck; maybe for A Team of Agents later, run outside the slides. Its pixel art (`assets/`) is licensed and **gitignored**: copy it to the MacBook by hand |
| `ideas.md` | Daniel's scratch pad: loose thoughts for the talk, not yet decided. Add new ones there, dated |
| `slides/slides.md` | The deck ([Slidev](https://sli.dev) v53, Vue 3 + Vite): title, the map, then each section's slides, with speaker notes |
| `slides/topics.ts` | **Every node on the map**: title, teaser, main point or sub-section, `optional`, position. Also the visited state and talk order |
| `slides/components/Hub.vue` | The map: main points on a horizontal line, sub-sections rising above on hover, details card, visited dots |
| `slides/components/TitleTree.vue` | Title-slide decoration: a circuit tree in the bottom-right corner (fixed drawing, not from `topics.ts`); the only circuit outside the map |
| `slides/components/LearningGraph.vue` | "Learning backwards": a book as a tiered chapter graph; buttons play reading in order (breadth-first to chapter 13) and working backwards (13, 10, 7) |
| `slides/components/PromptCard.vue` | The Wordle prompt as a terminal-style card with a **Copy** button (put the prompt between `<PromptCard>` tags) |
| `slides/components/HotTake.vue` | The running gag: a full page "Hot Take #N": the Hot Ones logo with ONES turned into TAKE (`public/hot-takes/hot-take-logo.svg`, a parody of a copyrighted logo; Daniel's call, 2026-11-02), the number in neon, the take beside it. `<HotTake no="71">the take<template #note>…</template></HotTake>` on a `layout: full` slide |
| `slides/components/UnitPath.vue` | The COMP1010 slide: the sentence, then COMP1010 as the root of the second-year units (names from Macquarie's unit guides; prerequisites as Daniel gave them), then edges up to later units, unlisted |
| `slides/components/WordCloud.vue` | The Interlude's word cloud: concepts by level, each level in its own ring (yellow, coral, lavender; a different shade per word), one level per click |
| `slides/components/CouchTests.vue` | Couch's real tests for the Testing section: the groups, and the YouTube-link tests from `youtube.test.ts`, word for word. Counts from a run on 2026-11-03 (18 files, 260 tests); rerun `npx vitest run` in `mcp-demo/` and update if they change |
| `slides/components/MonitorHud.vue` | The Monitoring slide: a mission-control screen scrolling a real stretch of flight-watch's `logs/app.log` (copied in, word for word) |
| `slides/components/DocViewer.vue` | Scrollable plain-text document with section-jump buttons and a line count; used by the two below |
| `slides/components/ClaudeMdViewer.vue` | "A real CLAUDE.md": this file, read at build time. **Shown to the audience**, so keep it current and readable |
| `slides/components/SkillViewer.vue` | "Skill Example": Couch's `add-to-couch` skill, read at build time from `mcp-demo/.claude/skills/` |
| `slides/global-top.vue` | On every slide: section marker bottom-left, Map button bottom-right, end-of-section nudge. None of it on full-bleed pages (`layout: full`) |
| `slides/slide-bottom.vue` | Under each slide: a warm paper background (`--optional-bg`) on slides in an optional section |
| `slides/setup/shortcuts.ts` | Keys: arrows run along a main point's chain of pages and stop at its ends; `H` = map; → / ← on the map; `T` = next colour theme |
| `slides/style.css` | Colours as named roles (`--deep`, `--teal`, `--orange`, `--muted`, …) for each theme, headings, bullets, the prompt card, key words (`.key`) |
| `slides/theme.ts` | Colour themes: Indigo (very dark navy with yellow since 2026-11-02; the default) and Pastel (cream, soft cyan and soft orange, brown-orange text); both tunable with `C`. `T` or the button by Map switches; remembered in the browser |
| `slides/public/` | Static files: photos for the Interlude and Beyond Coding, the Hot Take logo |
| `.github/workflows/pages.yml` | Builds and deploys to GitHub Pages on every push to `main` |

Commands: `cd slides && npm install && npm run dev` (http://localhost:3030, presenter view at `/presenter/`);
`cd slides && npx slidev build` (production build, also run by CI).

History: the repo previously held an interactive machine learning deck for Prof Christophe Doche's lecture.
It was removed deliberately; it's preserved at the `ml-deck` tag. Machine learning is out of scope for this talk.

### Lessons learned with this stack

- Every claim and number on a slide must come from something actually run or checked.
- Slidev class-name clashes: don't use `statement` (a built-in layout class) or `slider` as class names, nor
  `h1`/`h2`/`h3` (UnoCSS reads them as height utilities).
  The default theme greys out the first `p` after an `h1`; override with `.slidev-layout h1 + p { opacity: 1 }`.
- Fetch files in `public/` via `import.meta.env.BASE_URL` so the site works under `/<repo>/`.
- CI only has this repo: copy anything a slide shows from a sibling folder into it (as with the skill example).
- Pages: the workflow builds with `--base /<repo>/` and copies `index.html` to `404.html` so direct slide
  links (`/12`) load. They return HTTP 404 but render the deck, which is expected.
- Slidev turns off text selection on slides (`selectable` is off), so anything Daniel needs to copy on stage needs
  a copy button or `user-select: text` (as in `PromptCard.vue`).
- Turn off code-font ligatures (`font-variant-ligatures: none`); `==` and `->` otherwise render as symbols.
- Browser checks: Playwright from inside `slides/` (`playwright-chromium` is a dev dependency). Slidev keeps
  neighbouring slides in the DOM, hidden, so use `>> visible=true` locators. "Wake Lock permission denied"
  in headless browsers is harmless. `npx slidev export --format png` renders every slide for a visual check.
- Check in Safari too (Daniel presents from a Mac): Playwright's WebKit is installed (`import { webkit } from
  'playwright-core'`). Safari paints a round line cap for a zero-length dash, so a "hidden" `stroke-dashoffset`
  trace with round caps leaves a dot; hide it with `opacity: 0` as well.
- Commit and push only when Daniel asks.

## The talk: agreed plan

**Audience:** university students with **little to no coding background**. No code on slides beyond plain-English
prompts; explain terms like file, terminal, app. **Length:** 25 minutes core, plus up to 5 flexible minutes
covered by optional sub-sections. (Update 2026-10-30: the slot is **2 hours**, so there's room for flexible parts,
e.g. a ~15-minute live flight-project demo; see `ideas.md`.) **Main message:** software engineering is still worth learning, because the skill has
moved from typing to directing and judging. Secondary: use AI well for your own learning.

**Daniel's own lines (keep his wording):**

- **Coding ≠ Typing.** "I'm still coding, I'm just not typing." The title and headline.
- **Claude is a smart Google.** Google gives you ten links; Claude reads *your* code and answers *your* question.
- **100 vs 50 vs 20** (reworded 2026-10-07). In his field he's still better than Claude (he hopes): 100 vs maybe 50.
  But in many jobs that don't need deep thinking he's maybe a 20, so Claude's 50 is much better. Don't try to be 100 at
  everything; be 100 at something, and Claude won't make you obsolete. (The earlier "at 0 you can't tell when the 50
  is wrong, which is why the degree matters" is off the slide, kept in its notes.)
- **The biggest change is the writing, not the code.** AI writes his documentation, so it's much cleaner: wiki
  entries, issues, pull requests. He sees this as a bigger change than AI writing code. Say it without jargon
  (team handbook, to-do and bug list, "what I changed and why" notes for review).

**Naming:** the deck says "Claude Code" only as the product name (intro slides, the Claude Code slide, the map);
the Claude Code slide then says "From here on, we'll just call it Claude", and the rest says "Claude".

**Structure: a map.** The hub slide is a horizontal line of the main points in order (left to right, names
underneath); each point's **sub-sections** rise on a riser above it on hover (bottom to top in talk order, labels
to the right); an **optional** one has a dashed halo. Every slide, the map included, has the same background. A main point and its
sub-sections form one chain: the arrow keys run along it and stop at its ends. `H` or the Map button goes to the
map, and → on the map opens the next part of the talk. Current map (source of truth: `slides/topics.ts`), with
each part's slides:

```
Introduction         Have you heard of AI? (with "What I use" and a disclaimer: not an AI expert; Who am I?
                     removed 2026-10-08) · The blind men and the elephant (we each see one side of AI)
Claude Code          Claude Code (terminal or app, "just Claude", a folder, let's build an app)
  Wordle Demo          the live prompt
  Context and Memory   Context and Memory · Memory · A real CLAUDE.md
  MCP                  MCP (Blender): driven by Python through an MCP server (moved from Beyond Coding 2026-11-01)
                       · MCP (Couch): mcp-demo/, a page only Claude can change (added 2026-11-02). Before Skills
                       since 2026-11-02: hard rules in the server, then judgment in a skill
  Skills               Skills · Skill Example · With and without the skill (Couch's add-to-couch skill; replaced
                       the phrasebook 2026-11-02)
                       (Save and Ship, optional, removed 2026-10-08 for time)
  A Team of Agents     (placeholder, 2026-11-01: several sessions, each with its own job)
Interlude            Am I still coding? (a magazine-style page over Friedrich's Wanderer, 2026-11-02) · Coding, Typing,
                     Software Development (three words; click: Coding ≠ Typing; click: Coding ≈ Software Development) ·
                     Why do you code? · Hot Take #71 ("Nobody actually wants to code.") · If AI can do the coding for you, do
                     you still need to know the fundamentals? (click: Yes!) · In COMP1010 you learn the
                     basic language for talking to a computer (click: COMP1010 drops to the bottom and leads to COMP2010,
                     COMP2100, COMP2000, COMP2110; click: edges fan up to later units, ending in "…") · A word cloud
                     filling in waves: first-year words, then second-year, then advanced · Gordon Ramsay · Lynsi Snyder ("if you get to this level, you can ignore the fundamentals", a joke) ·
                     You still need to learn the fundamentals (click: …but has learning changed with AI?) · fundamentals vs things you can look up · The same loop four ways (Java, Python, Scratch
                     blocks and English to Claude, all at once) · Hot Take #88 ("A web API is just a bunch of
                     functions that live on the internet.") · Am I still coding if I use AI? (asked again; the rest of the Interlude being rewritten, 2026-11-02; the
                     Animation Demo placeholder removed, its material is in docs/kanji-video-case-study.md). A smaller
                     main point, added 2026-11-01 between the two halves
Beyond Coding        "Coding is not just coding." (Homer Simpson thinking it, a head-scratcher; the picture is
                     used under fair use, Daniel's call 2026-11-03, in public/beyond/)
                     · The parts of the job as 60s comic "POW!" bursts (Source Control, Testing, Monitoring,
                     Documentation, Learning; components/ComicBursts.vue). The quote slide was dropped 2026-11-03
                     (Hot Take #71 makes the same point)
  Testing              Why do we do testing? (one comic caption; first since 2026-11-03; click: a whispered
                       "to get full marks…") · An assignment (selection sort, Java skeleton) with "the fun
                       tests" and "…and the boring ones" (an empty array, null), all at once · Couch's 260 tests
                       in five groups · One video, ten ways to paste it (Couch's real YouTube-link tests,
                       word for word, plus five links it must refuse; the video id is Rick Astley's)
  Monitoring           A mission-control screen (2026-11-03): flight-watch's real logs/app.log scrolling, its counts
                       (96 INFO, 2 WARN, 32 ERROR) · Logs (used to be text in a
                       file: a web shop's log, four visitors' lines mixed, each with an id; click: one error is
                       ringed; click: every line with its id lights up, a discount bigger than the cart) · Logs, now
                       (a KQL query, as in Azure Monitor, pulls out that one id; the answer as a table) · Try it on
                       your computer's logs (a copyable prompt; but be careful: privacy, read each command, no admin)
  Source Control       Source Control (i.e. Git), a title page · Elden Ring and Skyrim box art, nothing else · Skyrim's real Load menu (a screenshot from
                       gameaccessibilityguidelines.com, credited on the slide) · essay_final_FINAL_really.docx: a real
                       File Explorer screenshot of a folder full of hand-made versions (public/source-control/final-folder.png) · A straight Git timeline: eight real
                       commits from this deck's own repo (components/GitTimeline.vue) · Hot Take #97 ("Learn Git as a save game
                       first. Branches can wait.") (2026-11-03; "what's the difference?": you can't
                       keep several saves in Elden Ring; covers are fair use, from Wikipedia; the old bullet slide is
                       parked in ideas.md)
  Documentation        Documentation (a plain title page) · Hot Take #412 · Code comments (a first-year Java method
                       whose comments only repeat the code) · Wiki (a wiki agent on a local clone; the other
                       agents send it summaries; written for AI agents, still readable for humans) · Issues and pull requests (links to flight-watch #23, #24, #36, #37;
                       an Azure DevOps work item's Development section, a Microsoft Learn screenshot)
  Learning             Learning with AI (a plain title page) · Learning backwards (interactive chapter graph) ·
                       Things you can do (Gemini Notebook, Matt Pocock's /teach skill, the Foundation for COMP1010
                       page; Daniel discusses or demos each, 2026-11-03; the "Learning with AI" bullet slide and a manga
                       version were dropped 2026-11-03)
Wrap-up              100 vs 50 vs 20 (moved here 2026-11-01) · Closing remarks
```

## Demos

**Wordle, built live** (decided 2026-10-07). A Wordle-style browser game called "Guess the Word" (not "Wordle",
a New York Times trademark that has had GitHub clones taken down; the repo name `wordle-demo` is fine). Stage steps:
`cd ~/repos/uni/2026-ai-talk/wordle-demo` → `claude --effort low` → the prompt on the Wordle slide → `open index.html`.
Delete `index.html` between rehearsals; keep `words.js`. Publish later as `sutantyo/wordle-demo` with GitHub Pages
(the older repo of that name was deleted by Daniel on 2026-10-07).

**Measured 2026-10-07: the live Wordle prompt** (Claude Code 2.1.292, Opus 5.5, plugins off, headless, one run each).
The prompt: *"Make a Wordle-style game called "Guess the Word" as a single web page in this folder: five-letter
words, six guesses, green, yellow and grey tiles that handle repeated letters correctly, and an on-screen keyboard
that changes colour too. Use the word lists in words.js for answers and allowed guesses. Don't run any tests."* →
**40 s**, about US$0.24, with the big 2026-10-08 word lists (it didn't read the whole 1 MB file). Earlier, with a
504-word list: 31 s; without "Don't run any tests.": 38 s; at default effort: 51 s; with Claude
writing its own word list instead of words.js: 66 s and 73 s. All built a working game (repeated letters correct,
nonsense guesses rejected). Live, Claude may still ask once to run a command; that pause isn't in the times. Fast
mode untested.

**Measured 2026-10-06, the earlier plan** (Claude Code 2.1.290, headless; quote these, don't round them up). The
vague prompt *"Make a Wordle clone that runs in the browser, in this folder."*: **97 s**, 8 steps, about US$0.43.
It worked, but Claude decided things nobody asked: it **accepted any five letters** (`XQZZV`), typed a 542-word list
from memory, and called itself "Wordle". Now the contrast in the Wordle slide's notes. A live change to that older
repo (*"Change the game so words are 6 letters instead of 5."*) took **39 s**, and GitHub Pages served it **about
44 s** after the push. Its `CLAUDE.md` said not to read its 1 MB word file, and Claude didn't.

**Skills: `japanese-phrasebook-demo`** (dropped 2026-11-02 for Couch's `add-to-couch` skill, which follows the Couch MCP
slide; kept here for the record. Decided 2026-10-07; public, `sutantyo/japanese-phrasebook-demo`).
A local, offline version of Daniel's online Japanese phrasebook (whose real version uses an MCP connector, which
is why it couldn't host skills): Svelte 5 page + Fastify + SQLite (`node:sqlite`), a `phrase` command with no
delete, and three project skills (`add-phrases`, `add-variation`, `review-phrases`) written in plain English to
show on screen, plus its own `CLAUDE.md` (rules: only change phrases through `phrase`, never reset). The page
updates live when the command writes, so the audience sees phrases arrive; seals speak with the Mac's Japanese
voice (Kyoko). Run: `npm start` → http://localhost:4173; `npm run demo:reset` between rehearsals.
Measured 2026-10-07 (headless, Claude Code 2.1.287): *"Add some phrases for buying medicine at a pharmacy"*
→ Claude chose `add-phrases` on its own and added 6 phrases in a new Pharmacy collection in **24 s**. It ended
questions with 「。」 where the book uses 「？」; that rule was then added to the skill (a real "this is what a skill
is for" example). Live, the skill shows the phrases and waits for Daniel's OK before adding. The Skills slide keeps
it simple ("tell Claude the skill's name"), so either name it in the demo or call the automatic pick a bonus.

**MCP: Blender** (decided 2026-10-07; Blender 5.1.2). Set up in `2026-ai-talk/blender`; Blender already open on
stage, not a cold start. DaVinci Resolve was considered and dropped: an MCP server needs its external scripting,
which is Studio-only (paid), and the free edition lost Python scripting entirely in v21.1. Aseprite MCPs exist but
run Aseprite in the background on files, so the audience wouldn't see the app being driven.

**Who wrote this bug? (Source Control, planted 2026-11-03 in `sutantyo/flight-watch`):** search `qf25` in lower case
and the app can't find the flight (`QF25` works). `git blame` on `server/feeds/routes.js` (the `const number = …` line
in `lookupRoute`) points to Gaurav's commit `940856a`, 26 Oct, "Routes: adsbdb takes either case, so stop
upper-casing the flight number": pushed straight to `main` with no pull request, and it changed the test from
`' qf 25 '` to `' QF 25 '` so everything still passes (151 tests). adsbdb does take either case, but the flight-number
check two lines below only accepts capitals. Ask Claude: "Searching qf25 finds nothing but QF25 works. Who changed
this, when, and why?"

**Git time travel (Source Control, idea 2026-11-03, to try on the MacBook):** show the deck as it was at commit
`4877136` (8 Oct) without touching the live deck: before the talk, `git worktree add ../deck-oct8 4877136`, then
`cd ../deck-oct8 && npm install && npx slidev --port 3031`, and switch to that browser tab on stage. Never check out an
old commit in the folder you're presenting from: the live deck would change under you. Not tested yet: check the old
version still runs.

**Stage setup:** run Claude Code without Daniel's personal plugins (the impeccable design hook made Claude spend its
final message on design warnings in earlier runs). The laptop needs `gh auth login`; Claude asks permission before
pushing, which can be an audience moment.

## To do

- **flight-watch on the MacBook** (for "Who wrote this bug?"): clone `sutantyo/flight-watch`, `npm install`,
  `npm start` → http://localhost:3200, then check `QF25` finds the route and `qf25` finds nothing. It can't run on
  GitHub Pages (it needs its own server).
- **Push the `data/pacific-replay` branch** (only on the Windows PC so far), so `REPLAY=pacific npm start` works on
  the MacBook if the venue's network fails.
- **flight-watch wiki:** Daniel creates the first page on the new repo; then push the rewritten wiki (9 commits, in
  `C:\repos\uni\flight-watch-wiki`) over it.
- **Git time travel:** try the worktree steps above on the MacBook.
- **After the talk, maybe:** host flight-watch somewhere like Railway so students can try it.

## Ideas not taken (yet)

- **Session replay:** a recorded Claude Code session stepped through on clicks, terminal on one side and a
  plain-English line per step on the other. **Agent loop diagram** lit up with it.
- **Spot the bug** (Wordle's repeated-letter rule: answer `ABIDE`, guess `SPEED`, only one E coloured), an
  **"Allow this?"** permission prompt vote, **you be Claude**.
- **"Why not just use an API?"** backup slide for MCP: an MCP server is an interface designed for the agent; you
  choose what it can do. Analogies: USB-C; "the API is the kitchen, MCP is the menu". (The Blender MCP is the
  opposite case: it runs any Python.)
- Wordle-specific skills (theme, word packs, ship, playtest): poor uses of skills.

## Open questions for Daniel (2026-10-08)

- Slides for the Animation Demo (the kanji clips); the QR code on the closing slide.
- "Claude is a smart Google" isn't on any slide yet.
- Real examples from his work: the intro story, the jobs where he's a 20 (100 vs 50 vs 20), Monitoring.
- Rehearsals: the Wordle prompt in an interactive session, the Blender demo (not timed yet), and a full timed run
  (the Claude Code section, ~10 min, is tight).
