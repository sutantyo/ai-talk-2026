# Ideas (scratch pad)

Daniel's loose thoughts for the talk, in any order. Not the plan: nothing here is on a slide until it moves into
`slides/slides.md`. Newest at the bottom; cross out or delete when used or dropped.

## 2026-10-29

- **Git, then GitHub.** Spend real time on these: git first (save points on your own computer), then GitHub
  (the same history online, shared with a team).
- **GitHub as a time-management tool.** Something practical students could use themselves:
  - put each piece of work in an issue, with an estimate of the hours it will take
  - ask Claude: how many hours of work do I already have? What are the deadlines? How much time do I actually have?
  - Could connect to the "Source Control" slide, or the to-do and bug list (issues) on "Documentation".
  - How GitHub records time (checked GitHub's docs, 2026-10-29; not tried yet): there's no built-in
    "time required" field. You add your own **number** field ("Hours") and decide it means hours, so it's as
    precise as you make it, not story points.
    - **Project fields** (use this with students): a GitHub Project (a board or table of issues) can have a custom
      number field ("Hours") and date field ("Due"). Works on a personal account; the table can total hours per
      group. GitHub's own quickstart makes a number field called "Estimate".
    - **Issue fields** (generally available July 2026): number, date, text or single-select fields on every issue,
      searchable, readable through the API. Organisations only, not personal accounts. Each organisation gets a
      default "Effort" field (type not checked).
    - Missing: no units, and no "time spent" against the estimate (GitLab has commands that record both).
      Time spent would need a second number field.
    - Demo prompt idea: "Add up the hours of my open issues, group them by deadline, and tell me whether I can fit
      them into my free hours this week."
    - Next step: set up a small test repo and project, and run the prompt for real.

## 2026-10-30

- **A made-up project as the running example: a flight disruption map.** Type a flight, see its path on a map with
  everything that could disrupt it: volcanic ash, storms, turbulence, raised volcano alerts. For the talk only (a
  web page, not Java). Gives the "Coding is not just coding" slides something real to show: wiki, history, to-do
  and bug list, tests, logs. Backdated history by a made-up team; say on stage that it's made up.
  - Data, all tested live 2026-10-30 with no account: OpenSky live planes and tracks (QFA144 Auckland to Sydney,
    101 positions over 173 min), worldwide SIGMETs from aviationweather.gov (120 active: 51 thunderstorm,
    33 turbulence, 18 icing, 13 volcanic ash, 2 tropical cyclone), USGS volcano alerts (4 raised, US only),
    USGS earthquakes, NOAA space weather. No "chance of eruption" exists anywhere: only alert levels.
  - Catches: people type QF144, planes broadcast QFA144; no future flights; the feeds can be quiet or down, so
    screenshots on the slides and live only as a bonus.
- **Who wrote this commit? (a security moment).** Git writes whatever author name and email you give it, and GitHub
  links the commit to whoever has that email on their account. Gaurav (staff, at the talk, agreed 2026-10-30) is
  the "main developer" of the flight project, with his real avatar on the commits, but he wrote none of them.
  Reveal: "Gaurav, did you write this?" Then the fix: signed commits (green **Verified**), and GitHub's vigilant
  mode labels the others "Unverified".
  - Found while testing: fake authors at `@example.com` got linked to four real strangers' accounts. Use
    made-up `.invalid` addresses for the pretend developers.
  - Possible home: Source Control.

## Talking points (no home yet)

- **The problem before the solution.** As students you're often handed solutions before you know the problem:
  e.g. object-oriented programming (classes) very early on, without knowing why. Some of this talk will be like that
  too (git, tests, monitoring all solve problems you haven't had yet), but I'll try to give the problem first.
  - Possible homes: the start of "Coding is not just coding" (the four things are all solutions to problems
    students haven't met), or the intro. Fits "Learning backwards" too: start from what you want, then fill gaps.
- **I don't necessarily code faster with AI.** Coding for me is mostly planning and designing a system. That now
  often takes even longer, because I discuss it with AI: things not worth taking up another engineer's time with.
  Once the plan is there, the write-up doesn't take long: hours of planning often come down to a 50-line class.
  So yes, AI speeds up my coding, no argument, but not as much as people think.
  - Possible home: "So am I still coding?" (the time goes into the thinking, not the typing).
- **The word "coding".** "Coding is a shorthand word we use to mean software development, but it's also one we use
  to describe typing." (Daniel's line, 2026-10-29.) Explains the title: Coding ≠ Typing.
  - Possible home: the title slide's notes or the opening, or "So am I still coding?".
- **AI artwork, Blender motion: the kanji clips** (2026-11-01). The full case study is in
  `docs/kanji-video-case-study.md`. The key line: "the breakthrough wasn't a better AI, it was knowing how to divide
  the work". Also: the "dusk" mistake (knowing what a morning looks like beat the model), AI texture yes, AI shape
  no, "free to download" isn't "free to use", and several Claude sessions working like a small studio.
  - Possible homes: "Making AI videos", MCP (Blender). Contact sheets and the final clip are on the PC
    (`C:\AI\pilot\blender\`). Setting up the MacBook for this: `docs/macbook-local-ai-setup.md`.

- **2026-11-01: an MCP demo of my own** (a website with no forms, changed only by asking Claude through MCP; a
  shareable stand-in for the Azure monitor at work). Brief and open questions in `mcp-demo/CLAUDE.md`. Shop
  prices are out (Woolworths blocks automated visitors); looking at free APIs instead.
