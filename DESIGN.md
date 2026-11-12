# BBRC design

How the app looks and behaves, and why. The book page (`/books/[slug]`) is the reference implementation; where this file says "for example", look there. Read it with `AGENTS.md`, which holds the hard rules (tokens only, nuqs for UI state, shadcn controls only). This file holds the taste behind them.

## What BBRC is

A book club's home: members mark books read, review them, join sittings (a shared read with a vote), shelve, quiz and compare. Most visitors are members; a few are admins who curate the library. Screens are read often and touched in small ways (mark, favorite, shelve), so the design favours **quick scanning and small, certain actions** over spectacle.

## Principles

1. **Quiet surfaces, small colour.** Backgrounds, cards and buttons are neutral (`background`, `muted`, `border`). Colour appears only in small marks: an icon, a rank, a bar, an underline. No full-colour cards, no gradients, no blurred colour stages, no tinted fills behind content. A page should still read correctly in greyscale.
2. **One loud thing per screen.** The filled primary button (`Button` default variant) is the single high-contrast element. Everything else is outline, ghost or plain text. On a book page that is "Mark as read".
3. **Structure carries information.** Borders, dividers and counts exist because they say something (a boundary, a group, a quantity). No eyebrows, no tracked all-caps labels, no middle-dot meta strings, no numbered markers unless the content is a sequence, no arrows appended to links.
4. **Equal heights in a row.** Anything side by side (chips, buttons, tabs, stat cells) shares one height. Mixed heights read as accidents. The scale: chips `h-7`, buttons and tabs `h-9`, compact buttons `h-8`.
5. **Small facts are chips, not stray text.** A fact about an object (status, series, pages, year, country, views) is an outlined `h-7` chip with a tinted icon. Loose grey sentences at the bottom of a block are not allowed; give the fact a chip or put it in the stat strip.
6. **Real content over decoration.** Show the cover, the author's face, the actual numbers. When data is missing, a typographic stand-in (the book's title on a neutral tile with a spine in an accent) beats a grey placeholder or a generic icon.
7. **State lives in the address.** Tabs, filters, sorts, pages and view switches are query strings or routes (nuqs), never `useState`. Reloading, back and shared links must land on the same view.
8. **Optimistic and honest.** Actions update the screen first and roll back on failure. Counts include every member; privacy hides names, never numbers.

## Shape, colour, type

- **Radius is the member's choice** (none by default). Never hard-code radii and never add `rounded-none`. Use `rounded-md` on shadcn-style components and groups; plain boxes just take a `border` and follow the global setting.
- **Colour comes from tokens only.** Surfaces: `background`, `muted`, `popover`. Lines: `border`. Text: `foreground`, `muted-foreground`. Accents: `info`, `violet`, `pink`, `success`, `warning`, `destructive`, each with an `-ink` text variant for icons and text on the page background. Never Tailwind palette classes (`text-amber-600`) and never `dark:` colour overrides. Palettes, fonts and text size are member preferences.
- **Accent meaning is by object, not by mood.** Rating and quiz are `warning`, reads and years are `success`, reading and shelves-as-library are `info`, wishlist and series are `violet`, favorites and editions are `pink`. Keep the same object the same colour everywhere. `lib/book-tones.ts` is the map (`BOOK_TONES`: `ink`, `solid`, `underline`); extend it rather than writing new classes.
- **Type** uses the Tailwind scale only (`text-3xs` to `text-5xl`), never `text-[11px]`. Titles are semibold, tight (`leading-[1.08]`, `tracking-tight`), `text-4xl` on phones and `text-5xl` from `sm`. Numbers use `tabular-nums`. Sentence case everywhere; no all caps.
- **Icons** are lucide at `size-3.5` (inside chips and cells), `size-4` (buttons, tabs). An icon is tinted with its object's `-ink` colour or left `text-muted-foreground`; it is never a filled tile.
- **Flags, not pins,** for countries (`CountryFlagIcon`). **Portraits, not names alone,** for people (`AuthorPhoto`, with a letter tile as fallback).

## Layout

- **Page width** is the shared main container. Pages stack vertically with `gap-5` to `gap-6`; blocks inside a section use `gap-2` for tight groups and `gap-5` between groups.
- **Detail pages** (book, author, shelf) open with a header made of the object's image on the left (`12rem`, `15rem` from `lg`) and its information on the right, then a sticky tab bar, then the tab's content. Phones stack: image, title and chips, primary action, numbers, tools.
- **Responsive rule of thumb:** one column on phones with the primary action reachable under the thumb, two columns from `sm`, labels appear on tool buttons from `md` (they are icon-only before that, each with an `aria-label`).
- **Sticky chrome** offsets are `top-[calc(3.5rem+max(0.25rem,env(safe-area-inset-top)))]` on phones and `md:top-14`. A sticky bar gets `pt-2` so text never touches the header edge.

## Components and patterns

### Chips (facts)
Outlined, `h-7`, `px-2`, `text-sm`, icon `size-3.5` on the left, optional external-link mark on the right. A chip is a link only when it goes somewhere (series page, filtered list, member). Hover is `bg-muted`. Order on a book: status, hidden, series, pages, year, country (flag, up to two, then `+n`), views, Open Library, requested by.

### Stat strip (numbers)
One hairline-divided strip (`gap-px` over a `bg-border` grid, outer `border`): the rating cell first (average, stars with partial fill, a five-bar histogram when there are reviews). The rating cell has a fixed width on wide screens (`17rem`) so the strip keeps the same proportions with or without reviews; the count cells share the rest equally. Then count cells (icon and label on one row, value below). Cells are links when there is somewhere to go: rating to reviews, read it to reads, reading to the reading tab, wishlisted to the signed-in member's own wishlist. **Each count carries a rank** next to the value, `#4` in a small outlined mark: the top three take the metric's colour, the rest stay muted. The title spells it out ("4th most read of all books"). Ranks come from the server (`getBookPulse`), counts update live on the client.

### Tabs
Slim (`h-9`), sticky, no boxes and no filled active state. The active tab has a 2px bottom line in its own tone and a tinted icon; inactive tabs are muted. Counts are neutral `bg-muted` badges and only show when above zero. The bar scrolls horizontally only (`overflow-y-hidden`, `overscroll-x-contain`), with arrows on desktop when it overflows, and brings the open tab into view. The bar's hairline is its own element so the active underline sits on top of it.

### Primary action
The filled button sits **under the cover on wide screens** and **above the numbers on phones** (one element, placed by grid order, never rendered twice). A split button joins the main part and a chevron: the main part squares its right corners only when the chevron exists, and the chevron's divider colours the left edge only (never all four borders). Signed out, it becomes "Sign in to track it".

### Tool group (secondary actions)
Shelf, feedback, favorite, quiz and share live in **one bordered group** with hairline dividers: ghost, square, equal-height buttons (`lib/book-deck.ts`). Icon-only below `md`, short labels from `md`. Admin tools never sit in this group: they collapse into one outline icon button (settings) at the **far right of the same row**, with a menu for edit, hide and a confirmed destructive delete. Only members who may manage books see it.

### Share menu
An outline or ghost trigger, a menu grouped into: actions on the item (share in a post, copy link), "Send with" (messengers), "Make a picture" (story).

### Dialogs and sheets
Pick-from-a-list dialogs use a radio list with a search field when there are more than five items, group headings only when both groups are non-empty, a quiet capacity or status mark per row, and a footer with a secondary "create" link on the left and the primary confirm on the right. Confirm labels name the outcome ("Add to Dune"), not "Submit".

### Images
- **Covers** are shown whole, never cropped, in a frame that takes the picture's own ratio, with a faint spine gradient. A broken or placeholder image (tiny, or wider than tall) counts as missing and is replaced by the typographic stand-in.
- **Click to enlarge:** a cover opens full size in a dialog sized by height (up to 88% of the screen), with a close button in the corner. The trigger shows a small zoom mark on hover and focus.

### Back and navigation
"All books" and similar parent links are small outline buttons (`h-8`) with a left arrow that nudges on hover, not bare text links.

### Counts and live data
Server-known counts come with the cached page (ISR). Numbers that move (reads, readers now, wishlists) are fetched in the browser through one shared hook so the header and the tabs agree. Skeletons are a small `bg-muted` block the size of the value, never a spinner.

## Content and copy

- Plain verbs, sentence case, the member's word for things ("feedback", "shelf", "sitting", "read"). An action keeps one name across button, dialog and toast.
- Empty states say what to do. Errors say what went wrong and how to fix it, with no apology.
- Rank text says what is ranked ("most read of all books"), never just "#4".

## Motion and focus

- Motion answers an action (open, expand, confirm). No page-load choreography, no hover lifts on every card. A small arrow nudge on a back button is the ceiling.
- Everything honours `prefers-reduced-motion` (`motion-reduce:transition-none`, `motion-safe:animate-pulse`).
- Visible keyboard focus on every control (`focus-visible:outline-2 outline-ring`, inset on tabs and cells so it is never clipped). Icon-only buttons have an `aria-label`; decorative icons are `aria-hidden`.

## Do and don't

| Do | Don't |
| --- | --- |
| Neutral surfaces, a tinted icon or rank | A coloured card, button or backdrop |
| Same height across a row | Mixed chip, button and badge heights |
| A chip for a fact | A loose grey sentence |
| Flag, portrait, cover | Pin icon, bare name, grey box |
| One filled button | Several competing primary buttons |
| Group tools in one bordered strip | Five separate outline buttons |
| Admin tools in one menu | Edit, hide and delete buttons on the page |
| Tokens and the Tailwind scale | Palette classes, `dark:` colours, arbitrary pixel sizes |

## Where things live

- Tones and accents: `apps/web/src/lib/book-tones.ts`
- Tool-button sizing: `apps/web/src/lib/book-deck.ts`
- Book page chrome: `apps/web/src/components/blocks/book-header.tsx`, `book-primary-action.tsx`, `book-stat-strip.tsx`, `book-action-dock.tsx`, `book-admin-menu.tsx`, `book-subnav.tsx`, `book-cover.tsx`, `book-views-chip.tsx`
- Server numbers for the header and tab counts, including ranks: `packages/api/src/modules/book/book-pulse.service.ts`
- Palettes, fonts, radius, defaults: `packages/shared/src/themes/`, `packages/shared/src/preferences.ts`, `packages/ui/src/styles/globals.css`
