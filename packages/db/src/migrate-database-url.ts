const DEFAULT_CONNECT_TIMEOUT_SECONDS = 30;

/**
 * URL for Prisma CLI migrations. Prefer an unpooled/direct Neon URL; fall back to
 * stripping `-pooler` from DATABASE_URL when only the pooled string is configured.
 */
/** Host + database name, ignoring Neon pooler hostname suffix (for comparing URLs). */
export function neonDatabaseTarget(connectionString: string): string {
	try {
		const url = new URL(connectionString);
		const host = url.hostname.replace("-pooler.", ".").replace(/-pooler$/, "");
		const database = url.pathname.replace(/^\//, "") || "postgres";
		return `${host}/${database}`;
	} catch {
		return "unknown";
	}
}

export function resolveMigrateDatabaseUrl(): string {
	const runtime = process.env.DATABASE_URL?.trim();
	const unpooled =
		process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DIRECT_URL?.trim();

	if (runtime && unpooled) {
		const runtimeTarget = neonDatabaseTarget(ensureDirectNeonHost(runtime));
		const unpooledTarget = neonDatabaseTarget(unpooled);
		if (runtimeTarget !== unpooledTarget) {
			console.warn(
				`[db:migrate:deploy] DATABASE_URL_UNPOOLED (${unpooledTarget}) does not match DATABASE_URL (${runtimeTarget}). ` +
					"Migrating via direct DATABASE_URL so schema matches what the app uses. Update or remove the wrong UNPOOLED value in Vercel.",
			);
			return ensureConnectTimeout(ensureDirectNeonHost(runtime));
		}
	}

	const raw = unpooled || runtime;

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
