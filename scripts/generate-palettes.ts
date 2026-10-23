// Regenerates the theme stylesheets from the palette and preference catalogs.
// Run with: bun run themes:generate
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildAppearanceCss, buildPalettesCss } from "../packages/shared/src";

const styles = join(import.meta.dir, "../packages/ui/src/styles");

writeFileSync(join(styles, "palettes.css"), buildPalettesCss());
writeFileSync(join(styles, "appearance.css"), buildAppearanceCss());
console.log("Wrote palettes.css and appearance.css");
