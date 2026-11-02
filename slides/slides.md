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
  weights: '400,600,700,900'
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
layout: full
---

<script setup>
const base = import.meta.env.BASE_URL
</script>

<figure class="elephant-full">
  <img :src="base + 'blind-monks-elephant.jpg'" alt="Blind monks feeling different parts of an elephant: trunk, tusk, ear, side, tail">
  <figcaption><b>The blind men and the elephant</b><span>Hanabusa Itchō, <i>Blind monks examining an elephant</i> (print, 1888)</span></figcaption>
</figure>

<style>
.elephant-full { position: absolute; inset: 0; margin: 0; }
.elephant-full img { width: 100%; height: 100%; object-fit: cover; object-position: center 45%; display: block; }
.elephant-full figcaption { position: absolute; left: 0; right: 0; bottom: 0; padding: 40px 28px 16px;
  background: linear-gradient(transparent, rgb(0 0 0 / 0.7)); color: #fff; display: flex; align-items: baseline; gap: 14px; }
.elephant-full figcaption b { font-size: 1.3rem; font-weight: 900; }
.elephant-full figcaption span { font-size: 0.7rem; opacity: 0.75; }
</style>

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
layout: full
---

<script setup>
const base = import.meta.env.BASE_URL
</script>

<div class="wanderer">
  <img :src="base + 'interlude/wanderer.jpg'" alt="Caspar David Friedrich, Wanderer above the Sea of Fog: a man on a rock, looking out over fog">
  <div class="frame"></div>
  <header>
    <div class="orn"><span class="badge">&lt;/&gt;</span></div>
    <div class="t1">Am I</div>
    <div class="t2"><span>Still</span></div>
    <div class="t3">coding?</div>
    <div class="orn"><svg class="badge" viewBox="0 0 24 24"><path d="M3 18 L10 7 L13.5 12 L16 9 L21 18 Z M8.2 10 L10 12.4 L11.6 10.2" /></svg></div>
  </header>
  <article lang="en">
    <p class="intro"><span class="drop">I</span> built a game without writing a single line of code. I built an app without even reading the source code. How can I call myself a coder?</p>
    <p>My keyboard has started to gather dust. The semicolon key, once my most trusted companion, now goes untouched for weeks. I used to know where every bracket closed; now I ask, and someone else closes them for me.</p>
    <p>At dinner parties, when people ask what I do, I hesitate. Programmer? Engineer? Director? I tell Claude what I want, I read what it says, I nod, I frown, I say "no, not like that", and somehow software appears.</p>
    <p>Is this how painters felt when the camera arrived? They kept painting, of course, but they had to decide what painting was for.</p>
    <p>So I stand here and look out over the fog, and wonder whether there is still a coder standing on this rock, or just a man in a good coat with a walking stick and strong opinions about how things should work.</p>
    <p>Perhaps that was always the job. I shall embrace it. Now even my jokes are written by Claude. Maybe that is why they are not as funny. And, no, you are not meant to read all this.</p>
  </article>
</div>

<style>
@import url('https://fonts.googleapis.com/css2?family=Ultra&family=Oswald:wght@600&family=Playfair+Display:ital,wght@1,900&family=Cormorant+SC:wght@600&family=EB+Garamond:wght@400&display=swap');
.wanderer { position: absolute; inset: 0; --tan: #d89a4e; --cream: #ece3d3; --ink: #1e1a16; color: var(--cream); }
.wanderer img { width: 100%; height: 100%; object-fit: cover; object-position: center 35%; display: block; filter: brightness(0.5) saturate(0.85) sepia(0.15); }
.wanderer .frame { position: absolute; inset: 14px; border: 1px solid var(--tan); outline: 1px solid var(--tan); outline-offset: -6px; pointer-events: none; }
.wanderer header { position: absolute; left: 60px; top: 42px; width: 290px; text-align: center; text-transform: uppercase; }
.wanderer .orn { display: flex; align-items: center; gap: 8px; margin: 0 auto; width: 170px; }
.wanderer .orn::before, .wanderer .orn::after { content: ''; flex: 1; height: 2px; background: var(--tan); }
.wanderer .badge { width: 38px; height: 38px; border: 2px solid var(--tan); border-radius: 50%; display: grid; place-items: center;
  font: 700 13px Oswald, sans-serif; color: var(--tan); box-sizing: border-box; padding: 6px; }
.wanderer svg.badge path { fill: none; stroke: var(--tan); stroke-width: 1.6; stroke-linejoin: round; }
.wanderer .t1 { margin-top: 10px; padding-top: 6px; border-top: 2px solid var(--tan); font: 400 70px/1 Ultra, serif; letter-spacing: 0.02em; }
.wanderer .t2 { margin: 6px 0; }
.wanderer .t2 span { display: block; background: var(--tan); color: var(--ink); font: 600 74px/1.05 Oswald, sans-serif; letter-spacing: 0.04em; }
.wanderer .t3 { padding-bottom: 8px; border-bottom: 2px solid var(--tan); margin-bottom: 10px; font: italic 900 66px/1.05 'Playfair Display', serif;
  text-transform: none; color: var(--tan); }
.wanderer article { position: absolute; right: 44px; bottom: 74px; width: 248px; column-count: 2; column-gap: 10px; padding: 5px 0 6px; border-top: 3px double var(--tan);
  border-bottom: 3px double var(--tan); font: 400 6.5px/1.25 'EB Garamond', serif; text-align: justify; hyphens: auto; }
.wanderer article p { margin: 0; text-indent: 1em; font-size: 6.5px; line-height: 1.3; text-wrap: pretty; }
.wanderer article p.intro { font: 600 7.5px/1.25 'Cormorant SC', serif; text-indent: 0; margin-bottom: 3px; text-align: left; }
.wanderer .drop { float: left; font: 400 23px/0.78 Ultra, serif; color: var(--tan); margin: 1px 3px 0 0; }
</style>

<!-- Caspar David Friedrich, Wanderer above the Sea of Fog (about 1818), public domain, via Wikimedia Commons. -->

---
layout: full
clicks: 2
---

<div class="words" :class="'s' + $clicks">
  <span class="w coding">Coding</span>
  <span class="w typing">Typing</span>
  <span class="w sd">Software Development</span>
  <span class="sym neq">≠</span>
  <span class="sym eq">≈</span>
</div>

<style>
.words { position: absolute; inset: 0; }
.words .w, .words .sym { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; line-height: 1;
  transition: left 0.9s cubic-bezier(.6,0,.2,1), top 0.9s cubic-bezier(.6,0,.2,1), font-size 0.9s, opacity 0.6s, transform 0.9s, color 0.6s; }
.words .coding { font: 900 100px Nunito, sans-serif; color: var(--orange); left: 300px; top: 250px; }
.words .typing { font: 900 58px Nunito, sans-serif; color: var(--ink); left: 720px; top: 140px; }
.words .sd { font: 900 46px Nunito, sans-serif; color: var(--teal); left: 650px; top: 410px; }
.words .sym { font: 300 96px Nunito, sans-serif; color: var(--ink); opacity: 0; left: 510px; top: 276px; }
/* the strike through Typing */
.words .typing::after { content: ''; position: absolute; left: -4%; right: -4%; top: 52%; height: 6px; border-radius: 3px;
  background: var(--orange); transform: scaleX(0); transform-origin: left; transition: transform 0.5s 0.6s; }

/* click 1: Coding ≠ Typing */
.words.s1 .coding { top: 276px; }
.words.s1 .coding { left: 270px; }
.words.s1 .typing { left: 720px; top: 276px; font-size: 80px; opacity: 0.75; }
.words.s1 .typing::after { transform: scaleX(1); }
.words.s1 .neq { opacity: 1; }
.words.s1 .sd { opacity: 0.2; }

/* click 2: Coding = Software Development */
.words.s2 .coding { left: 490px; top: 170px; font-size: 92px; }
.words.s2 .typing { left: 720px; top: 640px; opacity: 0; transform: translate(-50%, -50%) rotate(14deg); }
.words.s2 .typing::after { transform: scaleX(1); }
.words.s2 .eq { opacity: 1; left: 490px; top: 282px; font-size: 72px; }
.words.s2 .sd { left: 490px; top: 390px; font-size: 64px; opacity: 1; }
</style>

---
layout: full
---

<div class="ask">Why do you code?</div>

<style>
.ask { position: absolute; inset: 0; display: grid; place-items: center; font: 900 76px Nunito, sans-serif; color: var(--ink); }
</style>

---
layout: full
---

<HotTake no="71">
  Nobody actually wants to code.
  <template #note><v-click>They just want to solve a problem, or make something.</v-click></template>
  <template #ps><v-click at="1">(p.s. I don't like code golf)</v-click></template>
</HotTake>

---
layout: full
---

<div class="qa">
  <p class="q">If AI can do the coding for you, do you still need to know the fundamentals?</p>
  <p v-click class="a">Yes!</p>
</div>

<style>
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&display=swap');
.qa { position: absolute; inset: 0; padding: 0 90px; display: flex; flex-direction: column; justify-content: center; gap: 40px; }
.qa .q { margin: 0; max-width: 700px; font: 500 46px/1.2 Newsreader, serif; color: var(--ink); }
.qa .a { margin: 0; text-align: right; font: 500 46px/1.2 Newsreader, serif; color: var(--orange); }
</style>

---
layout: full
clicks: 2
---

<UnitPath :step="$clicks" />

---
layout: full
clicks: 2
---

<WordCloud :step="$clicks" />

---
layout: full
---

<script setup>
const base = import.meta.env.BASE_URL
</script>

<div class="person">
  <figure>
    <img :src="base + 'interlude/ramsay.jpg'" alt="Gordon Ramsay in chef's whites">
    <small v-click="1">Photo: Dave Pullig, CC BY 2.0</small>
  </figure>
  <v-click>
    <dl>
      <dt>Name</dt><dd class="name">Gordon Ramsay</dd>
      <dt>Occupation</dt><dd>Chef, restaurant owner, TV presenter</dd>
      <dt>Famous for</dt><dd>Hell's Kitchen, Kitchen Nightmares, MasterChef; his restaurants have won 17 Michelin stars</dd>
      <dt>Net worth</dt><dd>About US$220 million</dd>
    </dl>
  </v-click>
</div>

<!--
Photo first, then a click for the details. All the technical skill in the world: he can do every job in the
kitchen, and on Kitchen Nightmares he tastes one dish and knows what's wrong.
Sources: Wikipedia (Gordon Ramsay: 17 Michelin stars overall for his restaurant group, 8 held now); net worth is
Celebrity Net Worth's estimate (checked 2026-11-02), not an official figure. Photo: Wikimedia Commons,
"Gordon Ramsay.jpg" (Dave Pullig, 2006, CC BY 2.0); the credit line is what the licence asks for.
-->

---
layout: full
---

<script setup>
const base = import.meta.env.BASE_URL
</script>

<div class="person flip">
  <figure>
    <img :src="base + 'interlude/snyder.jpg'" alt="Lynsi Snyder under an In-N-Out awning">
    <small v-click="1">Photo: In-N-Out Burger, CC BY 4.0</small>
  </figure>
  <v-click>
    <dl>
      <dt>Name</dt><dd class="name">Lynsi Snyder</dd>
      <dt>Occupation</dt><dd>Owner of In-N-Out Burger</dd>
      <dt>Famous for</dt><dd>In-N-Out, started by her grandparents in 1948; the youngest female billionaire in the US in 2012</dd>
      <dt>Net worth</dt><dd>US$8.7 billion</dd>
    </dl>
  </v-click>
</div>

<!--
After Gordon Ramsay: photo first, then a click for the details. No famous cooking skills, she runs kitchens she
doesn't cook in, and she's worth about 40 times more. Let that sink in, then the next slide.
Sources: Wikipedia (Lynsi Snyder): In-N-Out founded 1948 by her grandparents Harry and Esther Snyder; sole owner
since her 35th birthday; youngest American female billionaire in 2012 (Bloomberg Billionaires Index); No. 153 on
the Forbes 400 in 2025 with US$8.7 billion. Photo: Wikimedia Commons, "Lynsi Snyder.jpg" (In-N-Out Burger,
CC BY 4.0).
-->

---
layout: full
---

<div class="lead-q">
  <p>You still need to learn the fundamentals</p>
  <p v-click>…but has learning changed with AI?</p>
</div>

<style>
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&display=swap');
.lead-q { position: absolute; left: 90px; right: 90px; top: 50%; transform: translateY(-50%); }
.lead-q p { margin: 0 0 28px; font: 500 46px/1.2 Newsreader, serif; color: var(--ink); white-space: nowrap; }
.lead-q p + p { color: var(--orange); }
</style>

---
layout: full
---

<div class="memo"><b>fundamentals</b><span>vs</span><i>things you can look up</i></div>

<style>
.memo { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  font: 900 64px/1.1 Nunito, sans-serif; text-align: center; }
.memo b { font-weight: 900; color: var(--orange); }
.memo span { margin: 10px 0; font-style: italic; font-weight: 600; font-size: 34px; color: var(--muted); }
.memo i { font-style: normal; color: var(--teal); }
</style>

---
layout: full
---

<div class="loops">
  <div class="lp"><div class="lang">Java</div>
<pre>for (int i = 1; i &lt;= 5; i++) {
    System.out.println(i);
}</pre></div>
  <div class="lp"><div class="lang">Python</div>
<pre>for i in range(1, 6):
    print(i)</pre></div>
  <div class="lp"><div class="lang">Scratch</div>
    <div class="scratch">
      <div class="blk var">set <i>i</i> to <b>1</b></div>
      <div class="blk ctl">repeat <b>5</b>
        <div class="inner">
          <div class="blk look">say <b class="r">i</b></div>
          <div class="blk var">change <i>i</i> by <b>1</b></div>
        </div>
      </div>
    </div>
  </div>
  <div class="lp en"><div class="lang">English, to Claude</div>
    <p>“Print the numbers 1 to 5.”</p>
  </div>
</div>

<style>
.loops { position: absolute; inset: 0; padding: 48px 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.lp { border: 1.5px solid var(--line); border-radius: 12px; padding: 14px 18px; background: var(--deeper); }
.lp .lang { font: 800 14px Nunito, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; color: var(--orange); margin-bottom: 10px; }
.lp pre { margin: 0; background: none; padding: 0; font: 500 19px/1.5 'Fira Code', ui-monospace, monospace;
  font-variant-ligatures: none; color: var(--ink); white-space: pre; }
.lp.en p { margin: 18px 0 0; font: 500 32px/1.25 Newsreader, serif; color: var(--ink); }
/* Scratch's own block colours */
.scratch { font: 700 16px Nunito, sans-serif; color: #fff; }
.blk { display: inline-block; padding: 6px 12px; border-radius: 6px; margin: 2px 0; }
.blk b, .blk i { display: inline-block; font-style: normal; padding: 0 9px; margin: 0 2px; border-radius: 12px; background: #fff; color: #575e75; }
.blk b.r { background: #ff8c1a; color: #fff; }
.blk.var { background: #ff8c1a; }
.blk.look { background: #9966ff; }
.blk.ctl { background: #ffab19; display: block; width: fit-content; padding-bottom: 10px; }
.blk.ctl .inner { margin: 6px 0 0 14px; display: flex; flex-direction: column; align-items: flex-start; }
.scratch > .blk { display: block; width: fit-content; }
</style>

---
layout: full
---

<HotTake no="88">
  A web API is just a bunch of functions that live on the internet.
</HotTake>

---
layout: full
---

<div class="again">Am I still coding if I use AI?</div>
<ul class="again-points">
  <li v-click>I decide what the problem is</li>
  <li v-click>I choose how to solve it <span class="aside">(with AI's help)</span></li>
  <li v-click>I judge whether the result is right</li>
  <li v-click class="also">And I have to know how to tell AI all this</li>
</ul>

<style>
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&display=swap');
.again { position: absolute; left: 90px; top: 33%; transform: translateY(-50%);
  font: 500 52px/1.15 Newsreader, serif; color: var(--ink); white-space: nowrap; }
.again-points { position: absolute; left: 90px; right: 90px; top: 44%; margin: 0; padding: 0; list-style: none; }
.again-points li { margin: 0 0 14px; padding: 0; font: 500 30px/1.3 Newsreader, serif; color: var(--orange); }
.again-points li::before { content: none; }
.again-points .aside { color: var(--muted); }
.again-points li.also { margin-top: 26px; color: var(--ink); text-align: right; }
</style>

---
routeAlias: beyond
layout: full
---

<script setup>
const base = import.meta.env.BASE_URL
</script>

<div class="doh">
  <div class="pic">
    <img :src="base + 'beyond/homer-thinking.jpg'" alt="Homer Simpson, thinking">
    <svg class="thought" viewBox="0 0 340 124" aria-hidden="true"><ellipse cx="170" cy="62" rx="166" ry="58" fill="#fff" stroke="#111" stroke-width="2.5" /></svg>
    <div class="words">Coding is not<br>just coding.</div>
  </div>
</div>

<style>
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');
/* The picture sits smaller in the bottom-right corner, on the same blue as its own background, so the edges vanish.
   Our thought bubble covers its "mmm... donuts" one; positions are fractions of the picture, so they scale with it. */
.doh { position: absolute; inset: 0; overflow: hidden; background: rgb(2 90 153); }
.doh .pic { position: absolute; right: 0; bottom: 0; width: 48%; aspect-ratio: 4 / 3; container-type: inline-size; }
.doh .pic img { width: 100%; height: 100%; max-width: none; display: block; }
.doh .thought, .doh .words { position: absolute; left: 43.9%; top: 33.5%; width: 34.7%; height: 16.9%;
  transform: scale(1.75); transform-origin: 72% 100%; }   /* bigger, growing up and left from where the thought dots meet it */
.doh .words { display: grid; place-items: center; font: 400 4.1cqw/1.05 'Patrick Hand', cursive; color: #111; text-align: center; }
</style>

---
layout: full
---

<ComicBursts />

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
layout: full
---

<div class="why-test">
  <span>Why do we do testing?</span>
  <div v-click class="marks"><svg viewBox="0 0 300 150" aria-hidden="true">
    <path d="M68 115 L22 148 L104 126 Z" fill="#fff" stroke="#111" stroke-width="3" stroke-dasharray="7 6" stroke-linejoin="round" />
    <ellipse cx="160" cy="70" rx="138" ry="62" fill="#fff" stroke="#111" stroke-width="3" stroke-dasharray="7 6" />
    <path d="M72 112 L30 141 L104 120 Z" fill="#fff" />
  </svg><b>to get full marks…</b></div>
</div>

<style>
@import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');
/* the comic page's grey rays, with the question in one caption box */
.why-test { position: absolute; inset: 0; display: grid; place-items: center;
  background: repeating-conic-gradient(from 0deg at 50% 52%, #d9d9d9 0deg 6deg, #f4f4f4 6deg 12deg); }
.why-test span { padding: 22px 44px; background: #ffd400; border: 4px solid #111; box-shadow: 8px 9px 0 #111;
  transform: rotate(-2deg); font: 400 72px/1 Bangers, sans-serif; letter-spacing: 0.03em; color: #111; }
.why-test .marks { position: absolute; right: 110px; bottom: -6px; width: 240px; height: 110px; transform: rotate(3deg); }   /* low, tail off the bottom edge: it comes from the audience */
.why-test .marks svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.why-test .marks b { position: absolute; left: 14%; right: 4%; top: 6%; bottom: 22%; display: grid; place-items: center;
  text-align: center; font: italic 600 19px/1.1 Nunito, sans-serif; color: #666; }   /* a whisper: dashed bubble, small and quiet */
</style>

---
layout: full
---

<div class="bored">
  <div class="assign">
    <div class="tag">Assignment 2: Selection sort</div>
<pre>/**
 * Sort the array into ascending
 * order, in place, using
 * selection sort.
 */
public static void selectionSort(
        int[] arr) {
    // TODO
}</pre>
  </div>
  <div class="cases">
    <div class="box">
      <div class="head">The fun tests</div>
      <div class="t fun"><b>✓</b>sorts {5, 2, 9, 1}</div>
      <div class="t fun"><b>✓</b>leaves a sorted array sorted</div>
      <div class="t fun"><b>✓</b>sorts a reverse-sorted array</div>
      <div class="t fun"><b>✓</b>sorts 10,000 elements</div>
    </div>
    <div class="box dull">
      <div class="head">…and the boring ones</div>
      <div class="grid">
        <div class="t">an empty array?</div><div class="t">null?</div>
      </div>
    </div>
  </div>
</div>

<style>
@import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');
.bored { position: absolute; inset: 0; padding: 28px 46px 60px; display: grid; grid-template-columns: 440px 1fr; gap: 30px; align-items: center;
  background: repeating-conic-gradient(from 0deg at 50% 52%, #d9d9d9 0deg 6deg, #f4f4f4 6deg 12deg); }
.bored .assign, .bored .box { background: #fff; border: 3px solid #111; box-shadow: 7px 7px 0 #111; padding: 16px 20px; }
.bored .assign { transform: rotate(-1.2deg); }
.bored .tag, .bored .head { display: inline-block; padding: 4px 14px; background: #ffd400; border: 2.5px solid #111;
  font: 400 28px/1 Bangers, sans-serif; letter-spacing: 0.03em; color: #111; }
.bored .assign pre { margin: 14px 0 0; background: none; padding: 0; font: 500 18px/1.45 'Fira Code', ui-monospace, monospace;
  font-variant-ligatures: none; color: #222; white-space: pre; }
.bored .box + .box { margin-top: 22px; }
.bored .t { margin: 8px 0 0; font: 600 21px/1.3 'Fira Code', ui-monospace, monospace; font-variant-ligatures: none; color: #111; }
.bored .t.fun { font-size: 18px; }
.bored .t.fun b { display: inline-grid; place-items: center; width: 26px; height: 26px; margin-right: 10px; border-radius: 50%;
  background: #1fae4b; border: 2px solid #111; color: #fff; font: 900 15px Nunito, sans-serif; vertical-align: 2px; }
.bored .dull { transform: rotate(0.8deg); }
.bored .dull .head { background: #ddd; }
.bored .dull .grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 18px; }
.bored .dull .t { font-size: 17px; color: #666; }
</style>

---
layout: full
---

<CouchTests view="groups" />

---
layout: full
---

<CouchTests view="basic" />

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
layout: full
---

<HotTake no="412">
  Experience is just undocumented knowledge.
  <template #note><v-click>Not 100% true. That's why it's a hot take.</v-click></template>
</HotTake>

---

# Undocumented knowledge

- A lot of knowledge is lost only because nobody wrote it down
- Now AI does the writing
- Our job: organise it <span class="eg">a table of contents, good section headings</span>

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
