---
name: announce
description: Prepare the announcement messages of latest changes to the platform for users in whatsapp formatting.
---

# Announce Skill

## Read the latest changes

Check out the git history. Get the latest changes.

## Prepare the announcement messages

By those changes, prepare an announcement message that owner can share on whatsapp group for users. It must be whatsapp formatted. And also user-facing, so no technical details, more like marketing messages.

Try to include only new features and bug fixes and improvements. No need to include chore, CI, migration, dependency updates, and other non-user-facing changes.

Try to be careful on admin-side updates, they are not user-facing.

Do not leak any security information.

## Title

For message title, always use this format:

_BBRC Platform Update • [DD.MM.HH]_
@all #bbrc-update

@all - is for mentioning all members of the group in whatsapp

#bbrc-update - just a tag for better searching.

[DD.MM.HH] - is days, months, and hours. Like 19.10.15 - 3pm at 19th october.

## Put it in file

Put the annoc message in .ignored/annoc.txt file. If that file already exists, delete that (or clear all content inside it) and replace it basically.
