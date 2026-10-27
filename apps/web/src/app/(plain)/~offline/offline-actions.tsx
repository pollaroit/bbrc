"use client";

import { Link } from "@/i18n/navigation";

export function OfflineActions({
	tryAgain,
	goHome,
}: {
	tryAgain: string;
	goHome: string;
}) {
	return (
		<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
			<button
				type="button"
				className="border border-border bg-background px-4 py-2.5 font-medium text-foreground text-sm"
				onClick={() => window.location.reload()}
			>
				{tryAgain}
			</button>
			<Link
				href="/"
				className="border border-border bg-muted px-4 py-2.5 text-center font-medium text-foreground text-sm"
			>
				{goHome}
			</Link>
		</div>
	);
}
