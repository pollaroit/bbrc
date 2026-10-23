"use client";

import { getPalette, lockedModeFor } from "@bbrc/shared";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
	updatePreference,
	usePreferences,
} from "@/lib/preferences/use-preferences";
import { nextThemeAfterToggle } from "@/lib/theme-toggle";

/** Light/dark control that respects dark-only or light-only palettes. */
export function useColorMode() {
	const preferences = usePreferences();
	const { resolvedTheme } = useTheme();
	const palette = getPalette(preferences.appearance.palette);
	const locked = lockedModeFor(palette.id);

	const toggle = () => {
		if (locked) {
			toast.info(
				`${palette.name} is a ${locked}-only palette. Choose another palette in Preferences to switch.`,
			);
			return;
		}
		updatePreference("appearance", "mode", nextThemeAfterToggle(resolvedTheme));
	};

	return { toggle, locked, palette, resolvedTheme };
}
