"use client";

import { cn } from "@/lib/utils";
import { useHasKeyboard, useIsMac } from "./book-flow/use-book-flow-hotkeys";

/** "⌘↵ to post", shown only where a keyboard is likely. */
export function SubmitShortcutHint({
	verb = "post",
	className,
}: {
	verb?: string;
	className?: string;
}) {
	const isMac = useIsMac();
	const hasKeyboard = useHasKeyboard();
	if (!hasKeyboard) return null;
	return (
		<span
			className={cn(
				"hidden text-2xs text-muted-foreground sm:inline",
				className,
			)}
		>
			{isMac ? "⌘" : "Ctrl"}↵ to {verb}
		</span>
	);
}
