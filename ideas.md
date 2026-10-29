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
