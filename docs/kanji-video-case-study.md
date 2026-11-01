# Case study: animated kanji clips (AI artwork, Blender motion)

Handed over on 2026-11-01 by the Claude session "Flashcard app with AI chat", which worked on Daniel's kanji
flashcard app. Times and numbers were measured, unless marked *estimate*. It's material for the talk's "Making AI
videos" slide and the MCP (Blender) section. For setting up a Mac to do the same, see `macbook-local-ai-setup.md`.

**The arc:** "Wow, AI can do this!" → "wait, why won't it…" → "oh, this is a craft problem, not a prompt problem"
→ the hybrid that works, made by a small studio of AI sessions with a human director.

## The project

- **The app:** a personal kanji flashcard web app (612 JLPT N5–N3 kanji). Each kanji has a learning page with
  mnemonics and a short animated video.
- **The art direction:** aizuri-e, the blue-ink woodblock prints of Hokusai and Hiroshige. A second Claude
  session, "Yuki", wrote the style guide.
- **The kanji font:** Yuji Syuku; later Aoyagi Reisho for the artwork (Part 2, step 5).

## Part 1: AI video on its own

### What AI did well: fast, cheap, competent

- **Wrote the whole app** in a few sessions: a Node server, spaced repetition, answer marking that tolerates
  typos (done on the computer itself), three themed levels, and a learning section with video. 11 tests pass.
- **Researched the video tools:** Higgsfield's plans and credits, open-weight models and their licences, and what
  runs on a 12 GB RTX 4070.
- **Installed a local AI studio carefully:** ComfyUI, the Wan 2.2 video model and the FLUX.2 klein image model,
  about 45 GB:
  - official sources only;
  - every download checked against its SHA-256;
  - no third-party plugins;
  - wary of prompt injection.
- **Wrote scripts** to drive it all from the command line.
- **The first images were impressive:** four woodblock-style dawn scenes in about 20 s each, and a recolour from
  blue to orange in 8 s that kept the composition exact to the pixel.

### The video attempt, step by step

The goal: 5 s of 早 ("early"), a blue dawn warming to an orange sunrise.

1. **The kanji on plain paper, image to video (72 s).** It worked, and the character stayed sharp. It felt like
   success.
2. **Ask for the landscape to warm up (4 min). Failed:** the colour change was ignored, and it stayed blue.
   Lesson: image-to-video models keep the start image's palette; the prompt isn't a magic wand.
3. **A different kind of model was needed,** one that takes a start frame *and* an end frame. That meant another
   10 GB download, and making an "end" image.
4. **The start-and-end render (3 min).** The colour changed in the first 1.5 s, then the clip sat still. The sun
   didn't rise.
5. **AI edits to lower the sun in the start image.** 2 of 4 tries barely changed it and 1 looked odd; the usable
   one was picked.
6. **The kanji stamped on, rendered again (3 min).** A lens-flare glare appeared, which is wrong for a woodblock
   print. The sun stayed put, then jumped in the last frames.
7. **New wording** ("slow, steady pace", "no lighting effects", plus things to avoid), a different random seed,
   and another render (3 min). Technically much better: a steady sun, no glare, the kanji intact.

### Daniel's verdict

> "the companion looks funny, i'd like to have the kanji actually rising like the sun, and the sunrise effect is
> really bad"

- **Every check passed:** the glyph was sharp, there was no glare, the sun moved. A human eye still saw at once
  that it wasn't good. AI can tick boxes; taste is a different skill.
- **His idea, the kanji itself rising, is what video AI does worst:** these models can't move text without
  warping it.
- **Paid tools wouldn't have saved it.** Higgsfield's models (Kling, Veo, Seedance) would make a prettier sunrise
  but would *not* fix the kanji. "You'd just pay to fail more beautifully, many times." Higgsfield's starter plan
  gives roughly 15–20 video attempts a month.

### Takeaways from Part 1

1. **AI collapses the cost of *trying*, not the need for *judgement*.** About 10 free renders in an afternoon;
   knowing which one was good, and why, was the human's job.
2. **Knowing the tools is expertise.** "Image-to-video keeps the palette" and "video models can't move text
   faithfully" are things practitioners know. Beginners learn them by burning time or credits.
3. **The first result is the most misleading one.** The early wins made it feel almost done.
4. **Good by the numbers isn't good by eye.**
5. **The fix came from old craft** (compositing in layers, narrowing what the AI does), not new AI. That's Part 2.

### Slide assets for Part 1 (on the PC)

- `C:\AI\pilot\haya\sheet.png`: the first-try plates (the "wow" moment).
- In `C:\AI\pilot\haya\sunrise\`:
  - `sheet-warm.png`: the recolours;
  - `strip-wan.png`: the prompt ignored;
  - `strip-inpaint.png`: too fast;
  - `strip-glyph.png`: the glare;
  - `strip-glyph-2.png`: the "technically fixed" version Daniel still judged bad. This is the key slide.
  - the matching `.mp4` files.

## Part 2: AI artwork, Blender motion

### 1. Pure Blender, no AI: control without art

- **The scene:** the 早 (morning) sunrise, built in Blender from a Python script: sine-wave hills, flat colours,
  the sun, the kanji rising, grass swaying in gusts, drifting mist.
- **Result:** 5 s rendered in 21 s, and every motion did exactly what was asked, every time.
- **But it looked like clip art,** not a woodblock print. Even with a paper texture, shapes made by formulas lack
  the irregular ink, line and texture of a print.

### 2. The hybrid that worked: AI for the artwork, Blender for the motion

- **The artwork:** the FLUX image model makes still "plates". FLUX image *edits* keep the composition aligned to
  the pixel, so variants line up perfectly.
- **The layers:** a small script cuts a plate into paper-theatre layers:
  - the sky, with the sun painted out (each row filled with its median colour);
  - the land, with the sky made transparent by detecting the hill line;
  - the sun disc.
- **The motion:** Blender stacks the layers at different depths and animates only a few numbers: positions,
  mood cross-fades, a camera push-in.
- **Result:** every visible pixel is AI artwork, and all the motion is exact. About 20 s per render, no retries.
- **Line for the talk:** "the breakthrough wasn't a better AI, it was knowing how to divide the work."
  Compositing in layers is decades-old video craft.

### 3. The "dusk" mistake: a prompt problem, not a tool problem

- **The mistake:** Claude asked FLUX for a warm "sunrise" version with the words "rust, plum and dusky violet".
  FLUX obeyed, and the clip went from bright blue to dark orange.
- **Daniel:** "it feels more like dusk." Right: that's a sunset palette, and getting darker reads as evening.
- **A real morning:**
  - brightness *rises* all the way through;
  - the warmth stays low, near the horizon, and only briefly;
  - the upper sky stays blue;
  - it ends paler and cooler.
- **The fix:** three mood plates (pre-dawn, sunrise, morning), cross-faded in Blender. The sunrise plate used
  Hiroshige's *New Year's Sunrise at Susaki* (CC0) as its reference.
- **Lesson:** knowing what a morning looks like mattered more than the model.

### 4. The kanji as part of the art: AI texture yes, AI shape no

- **The request:** Daniel wanted the 日 (sun) character to *be* the sun.
- **First version:** a filled gold glyph with a black outline. Daniel: "bolded? modern?"
  - Why it looked wrong: outlined, filled lettering is a comics and signage convention. Ukiyo-e prints text in
    solid sumi ink, and its sun has no outline at all.
  - Daniel saw it before either Claude session could say why.
- **The fix, a technique worth showing:**
  1. Place the exact font glyph, flat, in a muted pigment.
  2. FLUX "prints" it (uneven pigment, paper showing through, ragged edges), with the Hiroshige sunrise as its
     reference.
  3. Cut the result back to the exact font outline. The AI supplies the texture but can't change the character's
     shape, which is essential in a learning app.
- **A catch:** the art-director session found that the print texture broke 日's middle stroke, so it could read
  as 口. Fixed with a morphological close on the transparency, and paper show-through capped at 15% inside the
  glyph.
- **Lesson:** AI texture is welcome; AI-controlled *shape* is not, wherever correctness matters.

### 5. Fonts and licences: due diligence

- **Brush fonts compared:**
  - Google Fonts' heaviest, Potta One, is poster lettering.
  - The good brush fonts are by the calligrapher 青柳衡山 (Aoyagi Kouzan), free from Musashi System
    (opentype.jp): commercial use unrestricted, logos OK, no warranty. Aoyagi Reisho also requires its two
    documents when redistributed.
- **The decision:**
  - **Aoyagi Reisho** (clerical script) for kanji in the *artwork*: it reads as "old Japan".
  - **Yuji Syuku** (regular script) for *lessons*: Reisho changes some component shapes (e.g. 糸), and learners
    must copy the standard forms.
- **Licences across the toolchain:**
  - FLUX.2 klein 4B and Wan 2.2: Apache 2.0.
  - ComfyUI and Blender: GPL, which covers the software, not what you make with it.
  - The first FLUX VAE downloaded came from a *non-commercial* repo. It was swapped for the Apache copy of the
    identical weights; the output was identical, pixel for pixel.
  - A Japanese ukiyo-e model (Sakana Evo-Ukiyoe) is non-commercial and gated, so it wasn't used.
- **Lesson:** "free to download" is not "free to use commercially". Check every component, including the small
  ones.

### 6. The Australian twist: the wombat, and several Claude sessions working together

- **The change:** Daniel replaced the fox companion with a wombat.
- **What FLUX drew:** rats and quokkas. It only drew a wombat once the anatomy was spelled out: low barrel body,
  four stubby legs, broad flat head, small ears, no tail.
- **What failed:** "copy the wombat from image 2 into image 1". It went back to a quokka and leaked a sun into
  the pre-dawn sky.
- **A team of sessions:**
  - A dedicated "wombat" Claude session designed the character properly: model sheet, a hand-edited silhouette
    guide for the ears, claws, a transparent cut-out, removing specks, and a natural-colour twin.
  - The art-director session "Yuki" kept the style guide and reviewed renders.
  - The flashcard session put it all together.
  - The sessions coordinated by messaging each other; Daniel made the decisions.
- **Fitting it into the scene:**
  - The wombat is its own still layer, about 1/8 of the frame.
  - It's blue-grey at night and cross-fades to its natural grey-brown as the light rises. That was Daniel's idea,
    recorded as a deliberate exception to the "blue plus one accent colour" rule.
  - It "floated" until it was placed *behind* a traced grassy ridge, with a front layer covering its feet. Depth
    comes from overlap, as in paper theatre.
- **Lessons:**
  - Specialised sessions with clear briefs and clear ownership worked well, like a small studio.
  - Daniel's eye caught every problem the automated checks missed: floating, white specks, the wrong mood,
    modern-looking text.

### 7. The final format (STYLE.md in the kanji repo)

- **10-second clips.** The 5 s limit only came from AI video models; Blender has none (10 s rendered in 67 s).
- **Pacing:**
  - 0–2 s: establish;
  - 2–6 s: the story (日 rises, the moods cross-fade);
  - 6–7.5 s: settle;
  - 7.5–10 s: hold the complete kanji, for learners.
- **Full bleed:** FLUX often paints a paper border anyway, so the camera crops inside it. Keep about 10% safe
  space at the edges.
- **AI video** is now only for backgrounds or hero shots, never for anything touching the kanji.

## Hardware and model facts

**Desktop PC:** RTX 4070 (12 GB), 64 GB RAM, Windows.

- **FLUX.2 klein 4B:** 8–20 s per 1024² image.
- **Wan 2.2 5B:** about 72 s for a 2 s clip, about 4 min for a 5 s clip at 704².
- **Wan 2.2 14B:** two models of about 14 GB each at fp8. It would run by spilling into RAM, but slowly
  (*estimate* 15–40 min per 5 s at 480p). Not installed. It shines at realistic footage (physics, faces, camera
  moves); its size doesn't fix warped text or a lack of precise control.
- **Memory:** Claude Code once killed ComfyUI because the PC hit critical memory pressure. 64 GB is not infinite.

**Daniel's MacBook Pro:** base M5, 16 GB unified memory (he thinks 16–24; check in About This Mac).
See `macbook-local-ai-setup.md` for what it can and can't run.

## Slide assets for Part 2 (on the PC, not in this repo)

- `C:\AI\pilot\blender\nichi-wombat-10s.mp4`: the current final clip.
- `C:\AI\pilot\blender\strip-*.png`: contact sheets comparing the stages: clip-art Blender, the layered hybrid,
  dusk vs morning, outlined vs printed 日, Reisho, the wombat.
- `C:\AI\pilot\haya\`: the plates and moods.

Copy anything a slide shows into `slides/public/`: CI only has this repo.
