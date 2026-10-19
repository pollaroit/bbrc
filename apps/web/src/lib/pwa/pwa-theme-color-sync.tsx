"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import { isStandalonePwa } from "@/lib/pwa/is-standalone";

const LIGHT_THEME_COLOR = "#ffffff";
const DARK_THEME_COLOR = "#252525";

function upsertMeta(name: string, content: string) {
	let el = document.querySelector(`meta[name="${name}"]`);
	if (!el) {
		el = document.createElement("meta");
		el.setAttribute("name", name);
		document.head.appendChild(el);
	}
	el.setAttribute("content", content);
}

export function PwaThemeColorSync() {
	const { resolvedTheme } = useTheme();

	useEffect(() => {
		if (!isStandalonePwa()) {
			return;
		}

		const dark = resolvedTheme === "dark";
		upsertMeta("theme-color", dark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
		upsertMeta(
			"apple-mobile-web-app-status-bar-style",
			dark ? "black-translucent" : "default",
		);
	}, [resolvedTheme]);

	return null;
}
