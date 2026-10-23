"use client";

import { oklchToHex, paletteBackgroundTone } from "@bbrc/shared";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { usePreferences } from "@/lib/preferences/use-preferences";
import { isStandalonePwa } from "@/lib/pwa/is-standalone";

function upsertMeta(name: string, content: string) {
	const existing = document.querySelectorAll(`meta[name="${name}"]`);
	if (existing.length === 0) {
		const el = document.createElement("meta");
		el.setAttribute("name", name);
		el.setAttribute("content", content);
		document.head.appendChild(el);
		return;
	}
	for (const el of existing) {
		el.setAttribute("content", content);
	}
}

/** Keeps the browser and installed-app chrome in the palette's background colour. */
export function PwaThemeColorSync() {
	const { resolvedTheme } = useTheme();
	const { appearance } = usePreferences();

	useEffect(() => {
		const dark = resolvedTheme === "dark";
		const color = oklchToHex(
			paletteBackgroundTone(appearance.palette, dark ? "dark" : "light"),
		);
		upsertMeta("theme-color", color);

		if (isStandalonePwa()) {
			upsertMeta(
				"apple-mobile-web-app-status-bar-style",
				dark ? "black-translucent" : "default",
			);
		}
	}, [resolvedTheme, appearance.palette]);

	return null;
}
