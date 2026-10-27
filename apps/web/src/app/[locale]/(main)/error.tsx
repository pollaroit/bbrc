"use client";

import { Button } from "@bbrc/ui/components/button";
import { useEffect } from "react";

/** Keeps a render error inside the page area instead of blanking the whole app. */
export default function MainError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="flex flex-col items-start gap-3 border border-border border-dashed p-6">
			<div className="flex flex-col gap-1">
				<p className="font-medium text-sm">Something went wrong on this page</p>
				<p className="max-w-prose text-muted-foreground text-sm">
					Your action may have gone through. Reload the section to check.
				</p>
			</div>
			<Button type="button" size="sm" onClick={reset}>
				Try again
			</Button>
		</div>
	);
}
