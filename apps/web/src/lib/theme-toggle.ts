/** True when the user is typing in a field — theme hotkey should not fire. */
export function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	if (target.isContentEditable) {
		return true;
	}

	const tag = target.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
		return true;
	}

	if (target.closest("[contenteditable='true']") != null) {
		return true;
	}

	return target.closest("[role='textbox']") != null;
}

export function nextThemeAfterToggle(
	resolvedTheme: string | undefined,
): "light" | "dark" {
	return resolvedTheme === "dark" ? "light" : "dark";
}
