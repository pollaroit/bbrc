import { z } from "zod";

/**
 * Zod compiles faster parsers with `new Function`, probing first whether that is
 * allowed. Our CSP has no `'unsafe-eval'`, so the probe throws (and is caught), but
 * the browser still logs a CSP violation on every page load. Parsing in the browser
 * is never hot, so skip the probe there.
 */
z.config({ jitless: true });
