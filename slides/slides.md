---
theme: default
title: Coding ≠ Typing
colorSchema: light
# Within a section, content slides (left going forward, right going back; the heading stays put, see style.css).
# Moves to or from the map fade: setup/main.ts marks them, since Slidev picks forward transitions by deck order.
transition: fade
defaults:
  transition: slide-left
drawings:
  enabled: false
fonts:
  sans: Nunito
  weights: '400,600,700'
layout: default
class: title-slide
---

# Coding <span class="neq">≠</span> Typing

<p class="subtitle">How I use AI as a software engineer</p>

<p class="byline">Daniel Sutantyo</p>

<TitleTree />

<!--
Title slide.
-->

---
layout: full
routeAlias: hub
transition: fade
---

<Hub />

<!--
The talk map. The trunk (top to bottom) is the talk in order. → here opens the next section you haven't done;
← goes back to where you were. Sections are dead ends: press H (or Map) to come back here.
Orange branches are sub-sections (dashed ring = optional). Hover a node to peek, click to go there, press H anywhere to come back.
Topics, teasers and positions live in slides/topics.ts.
-->

---
routeAlias: intro
---

# Have you heard of AI?

Let me know what you have used

- **Chat** <span class="eg">ChatGPT · Claude · Gemini</span>
- **Specialists** <span class="eg">Midjourney · Suno · NotebookLM</span>
- **Agents** <span class="eg">Claude Code · OpenAI Codex · Google Antigravity</span>

What I use

- 2023 – **ChatGPT**, **Gemini**
- April 2026 – **Claude Code**

<p class="disclaimer">Disclaimer: I am not an expert in AI or LLM<br>These slides are my opinion, from my experience<br>They do not reflect the opinion of the teaching staff</p>

<!--
Ask one at a time and look at the hands.
Chat: you type, it answers, in a browser or app. Expect most hands.
Specialists: each does one job very well. Midjourney makes pictures, Suno makes songs, NotebookLM answers
from the notes you upload (good for study).
Agents: it works on your computer: creates files, runs programs. Expect few hands.
That gap is the bridge to Claude Code.
What I use: the old slide had May 2023 ChatGPT, January 2026 Gemini, April 2026 Claude Code.
Disclaimer: I use these tools every day, but I don't build them. Everything here is my opinion, from my own
experience as a software engineer; others will see it differently (the elephant, next). It isn't the view of the teaching staff. (LLM, a large language model: the kind of AI
behind ChatGPT, Gemini and Claude.)
-->

---

# The blind men and the elephant

<script setup>
const base = import.meta.env.BASE_URL
</script>

<figure class="elephant">
  <img :src="base + 'blind-monks-elephant.jpg'" alt="Blind monks feeling different parts of an elephant: trunk, tusk, ear, side, tail">
  <figcaption>Hanabusa Itchō, <i>Blind monks examining an elephant</i> (print, 1888) · public domain, via Wikimedia Commons</figcaption>
</figure>

<!--
The old parable: blind men each touch one part of an elephant (the trunk, a tusk, an ear, the side, the tail)
and each is sure the elephant is like a snake, a spear, a fan, a wall, a rope. Each is partly right; none sees
the whole animal.
AI is like the elephant. We all interact with it differently (chat, pictures, coding), so we each only see one
side of it. This talk is my side: a software engineer using it every day.
-->

---
routeAlias: claude-code
---

# Claude Code

- Claude Code runs on your own computer, either in a terminal or as a desktop app <span class="eg">(from here on, we'll just call it Claude)</span>
- It is still a chat window, but you can give it access to your computer, e.g. it can create files
  - <span class="eg note">(to be clear: the AI itself still runs on Anthropic's servers, not on your computer)</span>
- We start it in a folder: by default, it works and saves its files there
- To demonstrate, let's build a simple app

<!--
The basics. Claude Code is the bulk of the talk: its sub-sections on the map are Wordle, Context and Memory and
Skills.
Remote: the Claude Code program runs on my laptop and does the file work here, but the model runs on Anthropic's
servers: what I type, and the files it reads, are sent there. That's why context costs money.
Still a chat: you type, it answers. The difference is access: it can open, create and change files and run
programs, and it asks before it does (you'll see that when it asks to push Wordle).
A terminal is a text window where you type instructions instead of clicking. The desktop app is the same Claude
Code in an ordinary app window. Today I'll use the terminal.
The folder: Claude Code works in the folder you start it from. Going outside it needs your permission, and you
can give it access to more folders (/add-dir). For Wordle: the wordle-demo folder, which holds only words.js.
To demonstrate, let's build a simple app: hand over to the Wordle demo (next on the map).
-->

---
routeAlias: interlude
---

# So am I still coding?

- I still make the important decisions
- I need to be able to explain it to the AI agent
- I decide how AI should evaluate the end result
- "I'm still coding, I'm just not typing"

<!--
The interlude, between Claude Code and Beyond Coding, straight after the Claude Code demos. Wordle, the CLAUDE.md note, the skill, the save and the
push: all automated. Say it: "I didn't write a single line of code." Ask the question and let them answer, then:
director, not typist.
Coding ≠ Typing: the title of the talk.
-->

---

# Animation Demo

- AI draws the artwork, Blender moves it

<!--
Placeholder (2026-11-01): the Interlude's animation, after "So am I still coding?"; replaces the old Higgsfield
"Making AI videos" slide. Material: docs/kanji-video-case-study.md (the kanji clips: AI video alone failed, then
AI artwork plus Blender motion worked). Same message: knowing the craft is what makes the result good. Slides
still to write.
-->

---
routeAlias: beyond
---

# Coding is not just coding

- Source Control
- Testing
- Monitoring
- Documentation
- Learning

<!--
Opens Beyond Coding, after the Interlude: the rest of the job, beyond the code. Each item is a
sub-section of its own on the map (2026-11-01).
Things you may not have run into yet: at uni you write a program, hand it in, and you're done. At work the program
lives for years, many people change it, and real people use it. These four are what keeps that working.
One slide each comes next. Learning: lead into Learning with AI (learning backwards).
-->

---
routeAlias: close
---

# 100 vs 50 vs 20

- In my field I'm still better than Claude (I hope): if I'm 100, Claude is maybe a 50
- But in many jobs that don't need deep thinking, Claude is better than me
- There I'm maybe a 20, so even a 50 is much better than me
- Don't try to be 100 at everything; be 100 at something, and Claude won't make you obsolete

<!--
After "Coding is not just coding": apart from those parts of the job, there are other things I have to do, outside
my field. There Claude is better than me, and I'm fine if it takes control. (A real example from work to add.)
Claude makes mistakes; in my own field I catch them.
Earlier version, if useful: "at 0 you can't tell when the 50 is wrong; that's what your degree is for: 0 to 100".
-->

---

# Closing remarks

- To use AI well, you still need to understand computing concepts
- Learn how to use AI

<!--
The close. Back to the title: Coding ≠ Typing. Then questions.
Still to add: the QR code.
-->

---
routeAlias: wordle
---

# Wordle Demo

<PromptCard>Make a Wordle-style game called "Guess the Word" as a single web page in this folder: five-letter words, six guesses, green, yellow and grey tiles that handle repeated letters correctly, and an on-screen keyboard that changes colour too. Use the word lists in words.js for answers and allowed guesses. Don't run any tests.</PromptCard>

<!--
Sub-section of Claude Code. Live: cd ~/repos/uni/2026-ai-talk/wordle-demo (holds only words.js), claude --effort low,
type the prompt (or press Copy), then open index.html. Measured 2026-10-08: 40 s with the big word lists (see
CLAUDE.md); it may ask once to run a command.
Point out what the prompt decides: the name, one file, the rules, the word list I prepared. That's directing.
For contrast: the vague prompt "Make a Wordle clone that runs in the browser" took 97 s (2026-10-06) and decided
things for me: it accepted any five letters (XQZZV) and called itself "Wordle".
Delete index.html between rehearsals; keep words.js.
-->

---
routeAlias: memory
---

# Context and Memory

- Every Claude session starts from (almost) zero: it knows very little
- As it works, everything it reads adds to its <span class="key">context</span>
- Context is measured in tokens (pieces of words): more tokens, more cost
- There is a limit on how big a context can be <span class="eg">it can only hold so much at once</span>
- When we close the process, it forgets everything again

<!--
(Almost) zero: the model itself remembers nothing between sessions; Claude Code reads memory files in at the start
(CLAUDE.md in the project, a personal ~/.claude/CLAUDE.md, notes it keeps per project). The wordle-demo folder has
none of these, so there it really starts from nothing.
Context: not memory. It's the text Claude reads with every reply: the conversation so far, plus every file it has
opened. Like papers on a desk, cleared away when the session ends.
Tokens: small chunks of text, about 3/4 of a word on average in English; prices and the context limit (1M on my
model) are counted in them. Cost: the whole context is sent with every message, so a big context costs money again
and again (caching makes the repeated part much cheaper, but it still adds up).
Show /context here (cue: the word "context" in teal). A built-in command (not a skill) that shows what's in the
context right now. In a long session
building this deck (2026-10-07): 352k of 1M tokens used, of which this deck's CLAUDE.md was 5.3k and the conversation
315k. Everything it reads is something you pay for again on every message.
The limit: 1M tokens for the model I use (Opus 5.5, as /context shows). Near the limit, Claude Code summarises the
older conversation to make room (auto-compact; /context showed 33k tokens kept free for it), and details can be
lost in the summary.
-->

---

# Memory

- So does it have to read everything in the folder again, every time?
- That takes a long time, and a big project won't even fit in its context
- The trick: leave it a note it reads every time it starts <span class="eg">CLAUDE.md</span>
- A summary of what the project is, and anything important to know

<!--
Ask the question and let it land: it would be slow and costly, and you'd pay for it in context every time.
Like briefing a new colleague on day one, every day.
Without the note, Claude has to explore the project (open files, read code) before it can do anything, every
session. A short summary instead: Claude reads the note, then goes straight to the one file it needs.
The note is tiny next to everything Claude would otherwise read again (5.3k tokens here, see /context).
A real example of a "don't": an earlier Wordle project's note said "words.js is over 1 MB: don't read it whole",
and in the six-letter run (2026-10-06) Claude didn't open that file. Next slide: this deck's own CLAUDE.md.
-->

---

# A real CLAUDE.md

<ClaudeMdViewer />

<!--
This deck's own note: the project I've been building these slides in. Scroll through it: it's plain English,
no code. Use the buttons: what the project is, where things are, the don'ts (lessons learned).
Every new session reads this first, instead of working the whole project out again.
-->

---
routeAlias: mcp
---

# MCP (Blender)

- Blender can be controlled with Python
- Blender MCP server allows Claude to send it Python code to run
- For this demonstration, I pre-built some python scripts so that things run faster

<!--
Sub-section of Claude Code (moved from Beyond Coding 2026-11-01). Demo set up in ../blender (its own Blender MCP), with pre-built Python scripts
so it runs faster on stage.
On stage: Blender is already open (not a cold start).
Same lesson as Wordle: the more precisely you direct, the better the result. "Make a room" vs "a 4 m wall, a
window on the left, the sofa facing it".
Python: a programming language; Blender has one built in, so almost anything you can click, a script can do.
Blender's MCP is one end of the scale: it runs any Python, so Claude can do anything Blender can. Couch, next, is
the other end.
-->

---

# MCP (Couch)

- Couch: my own page of YouTube videos to watch, sorted into rows
- No buttons, no forms: the only way to change it is to ask Claude
- I decide what Claude can do: look, create and add. There is no delete
- My rules live in the server, so Claude can't get around them: Shorts go only on the Shorts page

<!--
Second MCP example (2026-11-02), the opposite of Blender: a narrow menu of safe actions. Couch is mcp-demo/ in this
repo (its own CLAUDE.md), hosted on Railway. Don't show its web address or the connector URL on screen.
On stage: the Couch page open in the browser (signed in), Claude Code beside it with the couch connector added.
Prompts:
- "Create a playlist called Claude on my Saved page and add <a YouTube link>": the page jumps to Saved, the row
  appears, the video glows "New".
- "Follow @blenderguru": the page jumps to Channels; the channel's row appears with its latest videos.
- The rule: ask to add a YouTube Short to a To Watch playlist; the server refuses (Shorts go only on the Shorts page).
Measured 2026-11-02, one run (Opus 5.5, hosted server): "add <link> to To Watch, under a Claude playlist" took three
steps (look at the playlists, create "Claude", add the video). The server's work took about a quarter of a second;
Claude's three steps took about 4 seconds in all (not counting Claude reading the prompt first, so not
prompt-to-screen). Needs Wi-Fi. There's no delete, so prepare or clear test data beforehand.
Why not just an API? An MCP server is an interface designed for the AI: you choose what it may do (here: no
delete). "The API is the kitchen, MCP is the menu."
Into Skills: hard rules go in the MCP server; preferences and judgment (e.g. "check it isn't saved already") go in
a skill, written in plain English.
-->

---
routeAlias: skills
---

# Skills

- MCP gave Claude the tools; a <span class="key">skill</span> tells it how I want the job done
- The steps, written in plain English, with a name
- Claude uses it when my request matches <span class="eg">or I tell it the skill's name</span>

<!--
Straight after MCP (Couch): same app, one step further. The MCP server holds the hard rules (no delete, Shorts only
on the Shorts page) that Claude can't get around. The skill holds my judgment: what I'd want done before adding.
A skill is a short file with a name and a description; Claude reads the description up front and picks the skill
when a request matches. Like a recipe card for one job: written once, used every time.
CLAUDE.md is about the project; a skill is about a task.
Students can write one on day one: it's just writing down how you want something done.
-->

---

# Skill Example

<SkillViewer />

<!--
Couch's real add-to-couch skill (mcp-demo/.claude/skills/add-to-couch/SKILL.md, read at build time).
The description: the top block is all Claude reads up front; it decides from this when to use the skill.
Check first: look on every page, not just the one I named.
Ask me first: if it's already saved, say where and wait for my yes.
Plain English throughout: anyone who knows how they want a job done can write one.
-->

---

# With and without the skill

"Add this video to my Claude playlist on To Watch" <span class="eg">it's already in Saved</span>

- **Without the skill:** Claude looked only at To Watch, didn't find it, and went to add a second copy
- **With the skill:** Claude checked every page, found it in Saved, and asked first <span class="eg">"Do you still want a second copy?"</span>
- Without it, Claude looked only where I pointed. With it, Claude checked everything and asked first

<!--
Measured 2026-11-02 by the couch session (Claude Code 2.1.316, Opus 5.5, headless, one run each, against the live
Couch with adding switched off so no data changed). Prompt: "Add https://www.youtube.com/watch?v=uWnUnMphmPM to my
Claude playlist on To Watch in Couch"; the video was already in Saved > AI.
With the skill (run in mcp-demo/): Claude chose add-to-couch on its own, listed every page, found it, and asked
"Do you still want a second copy in To Watch > Claude?". 6.2 s, about US$0.26.
Without (run from a folder without the skill): it listed only To Watch, said the video "isn't one of them yet" and
went to add it; the add failed only because adding was switched off for the test. 7.5 s.
Live: start Claude in mcp-demo/ (the skill only loads there), Couch open in the browser beside it.
-->

---
routeAlias: source-control
---

# Source Control

- A save point for your work, like a save game <span class="eg">go back to any point, any time</span>
- See exactly what changed, line by line, and who changed it
- Many people change the same project without overwriting each other
- Claude writes the "what I changed" note for each save
- One more step puts it online <span class="eg">this deck updates itself every time I save it to GitHub</span>

<!--
Source control (Git, GitHub): every save ("commit") is a snapshot with a note saying what changed and why.
Like Google Docs' version history, but for a whole folder and many people at once.
Claude writes the commit notes, and they're better than mine were ("fixed stuff").
The deck itself: pushing to GitHub rebuilds and publishes the website automatically (GitHub Pages).
Claude asks permission before it pushes: I stay the one who decides what goes online.
-->

---
routeAlias: testing
---

# Testing

- Small programs that check the real program still works
- They run every time something changes, in seconds
- Writing them is tedious, so people skip it; Claude writes them
- Still my job: deciding *what* to check <span class="eg">"what if the guess has the same letter twice?"</span>
- Tests also check Claude's work

<!--
A test: "give the program this, expect that". For the Wordle game: answer ABIDE, guess SPEED, only one E should be
coloured. If a change breaks that, the test fails straight away instead of a player finding it.
Claude writes tests quickly; the judgement is in knowing which cases matter (the tricky ones).
Tests check Claude too: when it changes something, the tests say whether it broke anything else.
(In the live Wordle prompt we said "Don't run any tests" only to save time on stage.)
-->

---
routeAlias: monitoring
---

# Monitoring

- A running app keeps a diary of everything it does <span class="eg">the logs</span>
- Far more than anyone can read
- When something breaks, someone has to find the lines that matter
- Claude reads the logs for me and points to the cause
- Still my job: knowing what "normal" looks like <span class="eg">and whether its answer makes sense</span>

<!--
Once an app is live, real people use it, at all hours. It writes a line for each thing it does: "user logged in",
"payment failed", "took 3 seconds". Monitoring is watching those, with alerts when something looks wrong.
Before: hours scrolling through logs. Now: "here are today's logs, why did payments fail at 2 pm?"
(A real example from work to add.)
-->


---
routeAlias: documentation
---

# Documentation

- Code says *how*; documentation says *what* and *why*
- **Team handbook** <span class="eg">the wiki: how things work, how to set up</span>
- **To-do and bug list** <span class="eg">issues: what's broken, what's next</span>
- **"What I changed and why"** <span class="eg">pull requests: notes for the person who checks my work</span>
- AI writes my documentation now, and it's much cleaner
- **Drift**: the code changes, the docs and comments don't <span class="eg">AI makes keeping them in step trivial</span>
- For me, the biggest change is the writing, not the code

<!--
Daniel's line: the biggest change is the writing, not the code. AI writes his documentation (wiki entries, issues,
pull requests), so it's much cleaner. He sees this as a bigger change than AI writing code.
Why it matters: you'll forget why you did something within months; a new teammate has never known.
Nobody likes writing it, so it's usually missing or out of date. Now it costs a sentence to ask for.
Drift: one of the biggest problems. Someone changes the code and doesn't update the documentation, or even the
comments in the code (notes written right next to it for the next person). Now the docs say one thing and the code
does another, which is worse than no docs. With AI it's trivial: "I changed this; update the docs and comments
to match", or "check the docs against the code and list what's out of date".
-->

---

# Do you memorise the textbook?

- As a student, you read the textbook <span class="eg">and sometimes memorise it for the exam</span>
- But why?
- If a page of the book answers the question, is it a good exam question?
- You don't need to memorise the book
- Remember the table of contents <span class="eg">later on, roughly what's in it</span>
- Documentation is the same <span class="eg">know what's there; look it up when you need it</span>

<!--
Daniel's points: as a student you're often required to read the textbook, and sometimes memorise it for the exam.
The question is why. If a question can be answered easily by looking up a page in the textbook, is that a good
question for an exam?
His claim: you don't need to memorise a textbook. It's good enough to remember the table of contents, or later on,
roughly remember what's in the book.
Link to documentation: nobody memorises the team handbook either. You know roughly what's in it and where, and you
look it up when you need it. These days Claude does the looking up: it reads the docs for me.
-->

---

# Hot Take <span class="take-no">#412</span>

<p class="hot-take">“Experience is just undocumented knowledge”</p>

- Not 100% true <span class="eg">that's why it's a hot take</span>
- But a lot of knowledge is lost only because nobody wrote it down
- Now AI does the writing
- Our job: organise it <span class="eg">a table of contents, good section headings</span>

<style>
.take-no { color: var(--orange); }
.hot-take {
  font-size: 2.1em; font-weight: 600; color: var(--deep);
  border-left: 6px solid var(--orange); padding: 0.2em 0 0.2em 0.8em; margin: 0.6em 0 1em;
}
</style>

<!--
Daniel's hot take, said as a joke ("#412": one of many). The number is made up; play it straight.
Why he thinks it: a lot of everyday knowledge lives only in people's heads or in chat threads that scroll away:
workarounds, quirks of old in-house tools, "you have to restart that one first". Manuals rarely cover the odd bug
or the edge case; a senior engineer fixes it because they've seen it before, a junior has nothing to read.
Writing docs is rarely rewarded, so the knowledge stays with a few people, and when they leave, it leaves too.
Not 100% true: some experience survives even good documentation (judgement, taste, knowing what to try first).
But a lot is lost only because nobody recorded it.
Where AI comes in: it does the writing now, so recording is cheap. What's left for us is organising the knowledge:
the table of contents and good section headings (back to the textbook: remember the contents, look up the rest).
-->

---

# Markdown

<script setup>
const raw = `# Week 3 notes

**Exam:** Friday, 10 am

- Read chapter 4
- Redo *question 2*
- [Lecture slides](https://…)`
</script>

Plain text, with a few symbols for formatting

<div class="md-compare">
  <div>
    <p class="md-label">What you type</p>
<pre class="md-raw">{{ raw }}</pre>
  </div>
  <div>
    <p class="md-label">What you see</p>
    <div class="md-rendered">
      <div class="md-h">Week 3 notes</div>
      <div><b>Exam:</b> Friday, 10 am</div>
      <div class="md-li">Read chapter 4</div>
      <div class="md-li">Redo <i>question 2</i></div>
      <div class="md-li"><span class="md-link">Lecture slides</span></div>
    </div>
  </div>
</div>

- Used by wikis, GitHub, note apps and AI chat replies <span class="eg">CLAUDE.md is Markdown too</span>

<!--
Markdown: a way to write formatted text with ordinary characters. # makes a heading, ** makes bold, * italic,
- a bullet list, [text](link) a link. Readable even before it's formatted, which is why it's everywhere.
The bold and bullets in ChatGPT's or Claude's answers: that's Markdown being displayed.
The CLAUDE.md and the skill from earlier in the talk: both Markdown files.
Worth learning: it takes ten minutes, and you'll use it for notes, READMEs, and talking to AI.
-->

---

# Keeping the wiki tidy

- A wiki grows messy: many authors, many years
- Claude reads the whole wiki before writing a page
- **Same style** <span class="eg">the same headings, tone and terms on every page</span>
- **No duplicates** <span class="eg">"we already have a page on this; I'll add to it"</span>
- **Nothing out of date** <span class="eg">finds pages that contradict each other or the code</span>
- **Linked up** <span class="eg">points each page to the related ones</span>

<!--
What AI is great at: reading everything, every time, and never getting bored. A person writing a new page doesn't
check fifty old ones first; Claude does.
Example ask, plain English: "Add a page on how we release a new version. Check the wiki first: if a page already
covers it, add to that one, and match the style of the other pages."
Still my job: deciding what's true. It can find two pages that disagree; I decide which one is right.
(A real example from work to add.)
-->

---
routeAlias: learning
---

# Learning with AI

- A book starts at chapter 1
- AI starts from what you want to do
- Then fills in only the gaps you need

<!--
Optional sub-section of Beyond Coding. Learning backwards: to learn chapter 31, a book makes you read top-down
(like a breadth-first search) through things you don't need yet. With AI you start from the leaf, work out the path
back to what you already know, and fill only those gaps.
The next slide shows it.
-->

---

# Learning backwards

<LearningGraph />

<!--
A book as a map of what needs what: each chapter leans on the ones above it.
Read it like a book: breadth-first, tier by tier. To reach chapter 13 you read 13 chapters.
Work backwards: I only want one thing from chapter 13. It leans on a bit of chapter 10, which leans on a bit of
chapter 7. Three chapters, and only the parts I need. That's how I learn with AI: start from the question, ask
what I'm missing, and fill only that gap.
-->

---
routeAlias: agents
---

# A Team of Agents

- Several Claude sessions, each with its own job, working together

<!--
Placeholder (2026-11-01): last sub-section of Claude Code. Several agents, each with a set responsibility, e.g. the
kanji clips: an art director that keeps the style guide, a character designer, and one that puts it all together,
messaging each other while I make the decisions (docs/kanji-video-case-study.md, Part 2, step 6). Slides still to
write.
Possible example (2026-11-02): coding-rpg-demo/, the Coding RPG game, run outside the slides.
-->
