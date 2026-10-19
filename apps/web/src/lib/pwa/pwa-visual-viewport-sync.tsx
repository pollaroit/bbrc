"use client";

import { useEffect } from "react";

import { isStandalonePwa } from "@/lib/pwa/is-standalone";

/**
 * Keeps `--pwa-vv-top` / `--pwa-vv-bottom` on `<html>` in sync with visualViewport.
 * iOS standalone PWAs often drift `position: fixed` chrome while the URL bar /
 * rubber-band scroll moves the layout viewport.
 */
export function PwaVisualViewportSync() {
	useEffect(() => {
		if (!isStandalonePwa()) {
			return;
		}

		const root = document.documentElement;
		root.classList.add("standalone-pwa");

		const vv = window.visualViewport;
		if (!vv) {
			return () => {
				root.classList.remove("standalone-pwa");
			};
		}

		const sync = () => {
			const bottomInset = Math.max(
				0,
				window.innerHeight - vv.offsetTop - vv.height,
			);
			root.style.setProperty("--pwa-vv-top", `${vv.offsetTop}px`);
			root.style.setProperty("--pwa-vv-bottom", `${bottomInset}px`);
		};

		sync();
		vv.addEventListener("resize", sync);
		vv.addEventListener("scroll", sync);
		window.addEventListener("orientationchange", sync);

		return () => {
			vv.removeEventListener("resize", sync);
			vv.removeEventListener("scroll", sync);
			window.removeEventListener("orientationchange", sync);
			root.style.removeProperty("--pwa-vv-top");
			root.style.removeProperty("--pwa-vv-bottom");
			root.classList.remove("standalone-pwa");
		};
	}, []);

	return null;
}
