---
name: organise-books
description: Sort ebooks dropped loose in the top level of /Users/sutantyo/books into the right subfolder, asking the user where each one goes, rename them to clean readable titles, and update the CLAUDE.md catalogue. Use when the user runs /organise-books or says they've added new books to sort.
---

# Organise Books

Library root: `/Users/sutantyo/books`. Loose books land in the root; organised books live in subfolders (e.g. `Humble Bundles/No Starch Press/`). The catalogue is `/Users/sutantyo/books/CLAUDE.md`.

## 1. Find loose books

List files **directly** in the root only (not subfolders):

```bash
find /Users/sutantyo/books -maxdepth 1 -type f \( -iname '*.pdf' -o -iname '*.epub' -o -iname '*.mobi' -o -iname '*.azw3' -o -iname '*.djvu' -o -iname '*.cbz' \)
```

Ignore `CLAUDE.md`, `.DS_Store` and anything else that isn't a book. If none, say so and stop.

## 2. Work out each book's real title

The filename is often junk (`9781718503229.pdf`, `rust_3e_ebook_v2.pdf`, `Effective_C_2nd_Ed-NSP.pdf`). For each file:
- Check `mdls -raw -name kMDItemTitle "<file>"` (often just the title; sometimes empty or garbage).
- If unclear, read the title/copyright pages with the Read tool (`pages: "1-4"` for PDFs) to get the title, edition, volume and author.
- Note the author too; it goes in the catalogue.

## 3. Build the clean filename

Match the convention already in `Humble Bundles/No Starch Press/`:

- `<Title>.<ext>`, using the book's own capitalisation and spaces, never underscores, dashes for spaces, or CamelCase.
- **Drop the subtitle** (`Algorithmic Thinking: Learn Algorithms to Level Up...` → `Algorithmic Thinking`). Keep it only when the main title alone is too vague, joined with ` - ` (e.g. `Deep Learning - A Visual Approach`).
- Edition, if not first: `, 2nd Edition` (e.g. `Effective C, 2nd Edition.pdf`).
- Volume: `, Volume 1` (e.g. `The Art of ARM Assembly, Volume 1.pdf`); volume comes before edition (`Write Great Code, Volume 2, 2nd Edition.pdf`).
- Variant/edition names that are part of the identity use ` - ` (`Introduction to Computer Organization - ARM Edition.pdf`).
- No `:` `/` `?` `*` or other characters macOS or Finder dislike; no ISBNs, publisher tags, `ebook`, `v2`, `(1)` etc.
- Keep the original extension, lowercased.

## 3b. Check whether the library already has it

Search every subfolder for the same book, comparing the **base title**: the clean name with `, Nth Edition`, `.ext` and case ignored, but keeping `, Volume N` (Volume 1 and Volume 2 are different books).

```bash
find /Users/sutantyo/books -mindepth 2 -type f -not -name '.*'
```

Then, based on the editions:
- **Loose copy is a newer edition** (e.g. loose `Effective C, 3rd Edition` vs filed `Effective C, 2nd Edition`): swap them without asking. Move the old file out to the root as `<Old Clean Name> (old).<ext>`, then move the new one into the same folder under its clean name. Never delete the old edition. Update its catalogue row (title, page count, authors if they changed) and report the swap.
- **Same edition, or you can't tell which is newer**: leave the loose file in the root, don't rename it, and ask the user to inspect it. Give both paths and anything that might differ (page count, file size, `mdls` title).
- **Loose copy is an older edition**: leave it in the root and tell the user the library already has a newer edition.

Books handled here are skipped in step 4.

## 4. Ask where each book goes

List the current destination folders (any directory under the root that already holds books, e.g. `find /Users/sutantyo/books -mindepth 1 -type d -not -path '*/.*'`).

Use AskUserQuestion, up to 4 books per call (one question each). Each question should name the original filename and the proposed clean name, e.g. *"Where should `rust_3e_ebook.pdf` → **The Rust Programming Language, 3rd Edition.pdf** go?"* Options:
- The most likely existing folder first, marked `(Recommended)` when there's a clear fit (same publisher/bundle).
- Up to 2 other existing folders.
- `Leave in root`: skip this book for now.

The user can pick "Other" to type a new folder path (relative to the root) and/or a corrected filename. Create new folders with `mkdir -p`.

## 5. Move and rename

- Before moving, check the target doesn't already exist. If it does, leave the book in the root and ask the user to inspect it, as in step 3b. Never overwrite.
- Move with `mv -n "<src>" "<dest>/<Clean Name>.<ext>"`, then confirm the file is at the destination.
- Never delete anything.

## 6. Update the catalogue

Edit `/Users/sutantyo/books/CLAUDE.md`:
- Add each moved book as a row under the closest topic heading in its folder's section, giving its title, author(s) and page count (`mdls -raw -name kMDItemNumberOfPages "<file>"`; use `—` for non-PDFs if unknown).
- New folder → new `## Catalogue: <path>` section, with topic sub-headings like the existing one.
- Update the folder's file count / size in the Layout block (`du -sh`).

## 7. Report

Give a short table: original filename → new path. Then list, separately:
- **Swapped for a newer edition:** the new file's path, and the old edition now in the root as `… (old).<ext>`, which the user can delete.
- **Left in root for you to inspect:** possible duplicates, older editions, and books you skipped.

Files ending in `(old)` in the root are retired editions, not new books. Don't offer to file them on later runs; just remind the user they're there.
