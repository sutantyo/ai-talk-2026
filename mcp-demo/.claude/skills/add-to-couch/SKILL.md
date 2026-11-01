---
name: add-to-couch
description: Add a YouTube video or Facebook reel to Couch, Daniel's video organiser, without saving it twice. Use when asked to add, save or queue a video in Couch ("add this to my Claude playlist", "save this under AI", "put this on To Watch"), even if no playlist is named.
---

# Add a video to Couch

Couch has three pages of playlists: **To Watch** (still to watch), **Saved** (watched and worth keeping) and
**Shorts** (Shorts and Facebook reels only). Couch's own rules, like "Shorts only on the Shorts page", are checked by
Couch itself. This skill is about judgment: what I'd want you to do before adding.

## 1. Check whether it's already there

Call `list_playlists` for **all** pages, not just the one I named. Each video is listed with its link, so look for
the same video id (the 11 characters after `v=` or `youtu.be/`, or the number after `/reel/`).

## 2. If it's already there, ask me first

- **Already in Saved:** I've watched it and kept it. Tell me which Saved playlist it's in, and don't add it to
  To Watch unless I say so.
- **Already in To Watch or Shorts:** tell me which playlist, and ask whether I still want it in the new one too.
- **Already in the very playlist I named:** just tell me; there's nothing to add.

Don't add a second copy until I say yes. A general "add it" doesn't count if I didn't know it was already there.

## 3. Pick the playlist

- If I named a playlist, use it. If it doesn't exist on that page, create it with that name.
- If I didn't name one, pick the closest by topic and say which; if nothing fits, suggest a new name and ask.
- To Watch unless I say I've watched it. A Short or a Facebook reel goes on Shorts.
- For a Facebook reel, give it a short title in plain words, a few words saying what's in it.

## 4. Add it and tell me in one line

Add it with `add_videos`, then say what was added and where, for example:
"Added *What Claude Code Can Do…* to To Watch › Claude."

If Couch refuses it (a Short in the wrong place, a video that can't be embedded), tell me why in one sentence and
offer the right page.
