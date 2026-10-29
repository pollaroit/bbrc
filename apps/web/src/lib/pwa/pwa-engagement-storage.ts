const STORAGE_KEY = "bbrc:pwa-engagement:v1";

export type PwaEngagementPreferences = {
	v: 1;
	soundsEnabled: boolean;
};

const DEFAULTS: PwaEngagementPreferences = {
	v: 1,
	soundsEnabled: false,
};

export function readPwaEngagementPreferences(): PwaEngagementPreferences {
	if (typeof window === "undefined") {
		return DEFAULTS;
	}

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return DEFAULTS;
		}
		const parsed = JSON.parse(raw) as Partial<PwaEngagementPreferences>;
		if (parsed.v !== 1) {
			return DEFAULTS;
		}
		return {
			v: 1,
			soundsEnabled: parsed.soundsEnabled === true,
		};
	} catch {
		return DEFAULTS;
	}
}

export function writePwaEngagementPreferences(
	next: Omit<PwaEngagementPreferences, "v">,
): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		const record: PwaEngagementPreferences = { v: 1, ...next };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
	} catch {
		// private mode / quota
	}
}
