export type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function isBeforeInstallPromptEvent(
	event: Event,
): event is BeforeInstallPromptEvent {
	return (
		"prompt" in event &&
		typeof (event as BeforeInstallPromptEvent).prompt === "function"
	);
}
