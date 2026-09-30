/** Interactive `$transaction` options for heavier multi-step writes (e.g. finish sitting). */
export const LONG_INTERACTIVE_TRANSACTION = {
	maxWait: 10_000,
	timeout: 30_000,
} as const;
