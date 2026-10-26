# Third-party notices

## tweakcn colour presets

The colour palettes in `packages/shared/src/themes/imported-palettes.ts` are
derived from the theme presets of **tweakcn**
(<https://github.com/jnsahaj/tweakcn>, `utils/theme-presets.ts`), which is
licensed under the Apache License, Version 2.0. The full licence text is at
<https://github.com/jnsahaj/tweakcn/blob/main/LICENSE>.

Changes made: only the colour values were used. They were converted to OKLCH,
and in some presets the text colours were lightly adjusted in lightness so the
palette meets the readability checks in `packages/shared/src/themes/contrast.ts`.
Presets or modes that could not be made readable were left out. Run
`bun run themes:import` to regenerate the file; the header of that file lists
what was adjusted or skipped.

## Atkinson Hyperlegible Next

The font files in `apps/web/src/app/fonts/` are Atkinson Hyperlegible Next, copyright the Braille Institute of America, Inc., served from Google Fonts and licensed under the SIL Open Font License 1.1 (https://openfontlicense.org).
