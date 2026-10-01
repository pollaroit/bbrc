"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { isEditableTarget, nextThemeAfterToggle } from "@/lib/theme-toggle";

/** Press `d` to toggle light/dark when not focused in an editable field. */
export function ThemeHotkey() {
	const { resolvedTheme, setTheme } = useTheme();

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented) {
				return;
			}
			if (event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}
			if (event.key.toLowerCase() !== "d") {
				return;
			}
			if (isEditableTarget(event.target)) {
				return;
			}

			event.preventDefault();
			setTheme(nextThemeAfterToggle(resolvedTheme));
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [resolvedTheme, setTheme]);

	return null;
}
