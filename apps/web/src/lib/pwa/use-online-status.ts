"use client";

import { useSyncExternalStore } from "react";

function subscribeOnlineStatus(onStoreChange: () => void) {
	window.addEventListener("online", onStoreChange);
	window.addEventListener("offline", onStoreChange);
	return () => {
		window.removeEventListener("online", onStoreChange);
		window.removeEventListener("offline", onStoreChange);
	};
}

function getOnlineSnapshot() {
	return navigator.onLine;
}

function getOnlineServerSnapshot() {
	return true;
}

export function useOnlineStatus() {
	return useSyncExternalStore(
		subscribeOnlineStatus,
		getOnlineSnapshot,
		getOnlineServerSnapshot,
	);
}
