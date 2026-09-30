import { ENV } from "../env.js";

export function assertDevSeedEnvironment(): void {
	if (ENV.NODE_ENV === "production") {
		throw new Error("Database seed is disabled when NODE_ENV=production.");
	}

	if (ENV.NODE_ENV !== "development") {
		throw new Error(
			"Database seed only runs in development (NODE_ENV=development).",
		);
	}
}
