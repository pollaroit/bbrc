"use client";

import { useEffect } from "react";
import { useColorMode } from "@/lib/preferences/use-color-mode";
import { isEditableTarget } from "@/lib/theme-toggle";

/** Press `d` to toggle light/dark when not focused in an editable field. */
export function ThemeHotkey() {
	const { toggle } = useColorMode();

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
			toggle();
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [toggle]);

	return null;
}
