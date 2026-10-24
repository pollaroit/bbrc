---
name: announce
description: Write the WhatsApp announcement for what changed on the BBRC platform since the last announcement. Use when the owner asks to "announce", "market" or "write the update message" for new features, improvements or fixes. Saves each announcement as its own file in .ignored/changelog/.
---

# Announce

Turn recent changes into one friendly WhatsApp message that the owner can paste into the members' group, and keep every message so earlier announcements are never lost.

The readers are club members, and many of them are not technical. They want to know what they can now do, where to find it, and why it is nice. They do not care how it is built.

## 1. Find what changed since the last announcement

1. Look at the newest file in `.ignored/changelog/` (they sort by name, newest last). Its name and title carry the date of the last announcement. If the folder is empty, use the last two weeks.
2. List what shipped since then:
   - `git log --oneline --since=<that date>` on the main branch and on the current branch
   - `gh pr list --state merged --limit 20` and the open PR for the current branch, when `gh` is available
3. Read the PR descriptions and the changed screens or routes to understand what members will actually see. Do not guess from commit titles.

If the work is not merged yet, still announce it when the owner asked for it together with the PR, and say in your reply that it will be true once deployed.

## 2. Decide what goes in

Include:

- new features
- visible improvements (new look, faster, easier)
- bug fixes members would have noticed

Leave out:

- chores, CI, dependency bumps, refactors, migrations, tests
- admin-only changes (members never see them). If one has a member-facing effect, describe only that effect.
- anything security-related: no tokens, endpoints, secrets, internal names, or how a protection works. A fix can be mentioned as "improved reliability", never with details.
- numbers that only make sense to developers (query counts, table names, versions)

If nothing user-facing changed, say so to the owner instead of inventing an announcement.

## 3. Write the message

### Voice

- Friendly and plain, like a club organiser talking to friends. Second person ("you can now…").
- Say what it does for the member, not how it works. "Your shelf now shows who added each book" beats "added an `addedBy` column".
- Name where to find things the way members see them: "Settings > Preferences", "the Achievements page", "your profile".
- One idea per bullet. Short sentences. No jargon: avoid API, cron, migration, cache, backend, endpoint, query.
- Use real feature names exactly as they appear in the app.
- Some emojis help scanning (one at the start of a section or bullet). Do not decorate every line.

### WhatsApp formatting (it does not render Markdown)

| Want | Write |
| --- | --- |
| Bold | `*text*` |
| Italic | `_text_` |
| Strikethrough | `~text~` |
| Monospace | `` ```text``` `` |
| Bullet | `• text` or `- text` at line start |
| Numbered | `1. text` |
| Quote | `> text` |

Do not use `#` headings, `**bold**`, `[text](link)` or tables. Put a plain URL on its own line if a link is needed. Use a bold line for each section heading, and a blank line between sections.

### Structure

Follow this order and drop any section that has nothing in it:

```
_BBRC Platform Update • [DD.MM.HH]_
@all #bbrc-update

<emoji> *Headline that says the best thing in one line*

<one or two sentences: what it is and why members will like it>

*What's new*
• <emoji> *Feature name*: what you can do now
• ...

*Better than before*
• <improvement>

*Fixed*
• <fix, described by what members noticed>

*Try it*
<where to tap, 1-2 lines>

*TL;DR*
<2-3 sentences with the main points>
```

Rules for the pieces:

- **Title (always exactly this):** `_BBRC Platform Update • [DD.MM.HH]_` on the first line, then `@all #bbrc-update` on the second.
  - `@all` mentions everyone in the group, `#bbrc-update` makes announcements searchable.
  - `DD.MM.HH` is day, month and hour, for example `19.10.15` for 3 pm on 19 October. Use the club's time zone (Asia/Dubai): `TZ=Asia/Dubai date +%d.%m.%H`.
- **Headline:** one bold line with the most exciting change. Not "Update!" and not a list.
- **Length:** aim for 120 to 250 words before the TL;DR. WhatsApp messages get skimmed, so cut anything that does not help a member act or understand.
- **Big update, many features:** group bullets under bold sub-headings (for example `*Shelves*`, `*Profiles*`) instead of one long list. Put the biggest feature first.
- **Small update:** skip the sub-headings and use two or three bullets.
- **Try it:** only when members need to find something. Say the path, not "go to the website".
- **TL;DR (always the last section):** a bold `*TL;DR*` followed by 2 or 3 short sentences covering the main points. It must still make sense if it is the only thing someone reads.
- **Closing line:** optional, one friendly question or invitation placed before the TL;DR (for example asking members to try it and share feedback). Do not end with generic thanks.

## 4. Save it without overwriting anything

Every announcement is its own file inside `.ignored/changelog/`. Never edit or delete an earlier one.

- Create the folder if it does not exist.
- File name: `YYYY-MM-DD-HH-short-topic.txt`, using the same moment as the title, for example `2026-10-24-19-collaborative-shelves.txt`. The topic is two to four lowercase words joined with dashes.
- File content: only the message, ready to paste. No notes, no extra headings, no Markdown fences.
- If the same file name already exists, add `-2` before `.txt`. Do not replace it.

`.ignored/` is not committed, so do not run `git add` on it.

## 5. Report back

After saving, tell the owner in a few lines:

- the file path
- what the announcement covers (one short list)
- anything you left out on purpose that they may want to add (admin-only or unmerged work)

Do not paste the whole message into the reply unless asked. The file is the deliverable.

## Checklist before finishing

- [ ] Title and the `@all #bbrc-update` line are exact
- [ ] Only member-facing changes, nothing security-sensitive
- [ ] WhatsApp formatting only, no Markdown links, headings or tables
- [ ] Plain language a non-technical member understands
- [ ] Ends with `*TL;DR*` (2 to 3 sentences)
- [ ] Saved as a new file in `.ignored/changelog/`, nothing overwritten
