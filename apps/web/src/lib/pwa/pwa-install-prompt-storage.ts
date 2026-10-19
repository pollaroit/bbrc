const STORAGE_KEY = "bbrc:pwa-install-prompt:v1";

type InstallPromptRecord = {
	v: 1;
	choice: "rejected";
};

export function isPwaInstallPromptRejected(): boolean {
	if (typeof window === "undefined") {
		return false;
	}

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return false;
		}
		const parsed = JSON.parse(raw) as InstallPromptRecord;
		return parsed?.v === 1 && parsed.choice === "rejected";
	} catch {
		return false;
	}
}

export function markPwaInstallPromptRejected(): void {
	if (typeof window === "undefined") {
		return;
	}

	try {
		const record: InstallPromptRecord = { v: 1, choice: "rejected" };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
	} catch {
		// private mode / quota
	}
}
