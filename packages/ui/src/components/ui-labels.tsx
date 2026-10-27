"use client";

import { createContext, type ReactNode, useContext } from "react";

/** The few words packages/ui draws by itself (screen-reader names), in English by default. */
export type UiLabels = {
	close: string;
	loading: string;
	toggleSidebar: string;
	scrollToEnd: string;
	scrollToStart: string;
};

export const DEFAULT_UI_LABELS: UiLabels = {
	close: "Close",
	loading: "Loading",
	toggleSidebar: "Toggle Sidebar",
	scrollToEnd: "Scroll to end",
	scrollToStart: "Scroll to start",
};

const UiLabelsContext = createContext<UiLabels>(DEFAULT_UI_LABELS);

/** The app hands translated words down once, so these components need no translation library. */
export function UiLabelsProvider({
	labels,
	children,
}: {
	labels: UiLabels;
	children: ReactNode;
}) {
	return (
		<UiLabelsContext.Provider value={labels}>
			{children}
		</UiLabelsContext.Provider>
	);
}

export function useUiLabels(): UiLabels {
	return useContext(UiLabelsContext);
}
