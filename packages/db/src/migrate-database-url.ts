const DEFAULT_CONNECT_TIMEOUT_SECONDS = 30;

/**
 * URL for Prisma CLI migrations. Prefer an unpooled/direct Neon URL; fall back to
 * stripping `-pooler` from DATABASE_URL when only the pooled string is configured.
 */
export function resolveMigrateDatabaseUrl(): string {
	const raw =
		process.env.DATABASE_URL_UNPOOLED?.trim() ||
		process.env.DIRECT_URL?.trim() ||
		process.env.DATABASE_URL?.trim();

	if (!raw) {
		throw new Error(
			"DATABASE_URL (or DATABASE_URL_UNPOOLED) is required to run migrations",
		);
	}

	return ensureConnectTimeout(ensureDirectNeonHost(raw));
}

function ensureDirectNeonHost(connectionString: string): string {
	try {
		const url = new URL(connectionString);
		if (url.hostname.includes("-pooler.")) {
			url.hostname = url.hostname.replace("-pooler.", ".");
		} else if (url.hostname.endsWith("-pooler")) {
			url.hostname = url.hostname.slice(0, -"-pooler".length);
		}
		return url.toString();
	} catch {
		return connectionString;
	}
}

function ensureConnectTimeout(
	connectionString: string,
	seconds = DEFAULT_CONNECT_TIMEOUT_SECONDS,
): string {
	try {
		const url = new URL(connectionString);
		if (!url.searchParams.has("connect_timeout")) {
			url.searchParams.set("connect_timeout", String(seconds));
		}
		return url.toString();
	} catch {
		return connectionString;
	}
}
