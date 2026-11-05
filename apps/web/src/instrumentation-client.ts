import { z } from "zod";

/**
 * Runs in the browser before any app code. Zod decides whether it may compile
 * parsers with `new Function` when each schema is created, probing first. Our CSP
 * has no `'unsafe-eval'`, so the probe is caught but the browser still logs a CSP
 * violation on every page load. It has to be switched off here, before the first
 * schema exists; parsing in the browser is never hot, so nothing is lost.
 */
z.config({ jitless: true });
