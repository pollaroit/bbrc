"use client";

import type { SpoilerContentKind } from "@bbrc/shared";
import { isSpoilerRevealed, markSpoilerRevealed } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { useState } from "react";
import { usePreferences } from "@/lib/preferences/use-preferences";
import { cn } from "@/lib/utils";

type SpoilerContentGateProps = {
	username: string | null | undefined;
	kind: SpoilerContentKind;
	identifier: string;
	isSpoiler: boolean;
	children: React.ReactNode;
	className?: string;
};

export function SpoilerContentGate({
	username,
	kind,
	identifier,
	isSpoiler,
	children,
	className,
}: SpoilerContentGateProps) {
	const [revealed, setRevealed] = useState(() =>
		isSpoilerRevealed(username, kind, identifier),
	);

	// Members can choose to see spoilers without tapping; applies after hydration.
	const { reading } = usePreferences();

	if (!isSpoiler || revealed || reading.spoilers === "show") {
		return <div className={className}>{children}</div>;
	}

	return (
		<div className={cn("relative min-h-[5rem]", className)}>
			<div className="pointer-events-none select-none blur-md" aria-hidden>
				{children}
			</div>
			<div className="absolute inset-0 flex items-center justify-center bg-background/60">
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="pointer-events-auto relative z-[2]"
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						if (username) {
							markSpoilerRevealed(username, kind, identifier);
						}
						setRevealed(true);
					}}
				>
					Reveal spoiler
				</Button>
			</div>
		</div>
	);
}
