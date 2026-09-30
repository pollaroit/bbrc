"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";

/**
 * React 19 / Next 16: next-themes FOUC script triggers a dev console error when
 * rendered as a client `<script>`. On the client, use a non-executable type so
 * React stops warning; SSR still emits a normal blocking script on first paint.
 * @see https://github.com/shadcn-ui/ui/issues/10200
 */
const scriptProps: React.ComponentProps<
	typeof NextThemesProvider
>["scriptProps"] =
	typeof window === "undefined"
		? { suppressHydrationWarning: true }
		: { suppressHydrationWarning: true, type: "application/json" };

export function ThemeProvider({
	children,
	...props
}: React.ComponentProps<typeof NextThemesProvider>) {
	return (
		<NextThemesProvider {...props} scriptProps={scriptProps}>
			{children}
		</NextThemesProvider>
	);
}
