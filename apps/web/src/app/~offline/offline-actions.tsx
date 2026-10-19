"use client";

import Link from "next/link";

export function OfflineActions() {
	return (
		<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
			<button
				type="button"
				className="border border-border bg-background px-4 py-2.5 font-medium text-foreground text-sm"
				onClick={() => window.location.reload()}
			>
				Try again
			</button>
			<Link
				href="/"
				className="border border-border bg-muted px-4 py-2.5 text-center font-medium text-foreground text-sm"
			>
				Go to home
			</Link>
		</div>
	);
}
