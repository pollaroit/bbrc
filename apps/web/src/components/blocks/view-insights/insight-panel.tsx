import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A bordered section with a title and one line saying what it shows. */
export function InsightPanel({
	title,
	description,
	action,
	children,
	className,
}: {
	title: string;
	description?: ReactNode;
	action?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn(
				"flex min-w-0 flex-col gap-4 border border-border bg-card p-4",
				className,
			)}
		>
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 flex-col gap-1">
					<h2 className="font-semibold text-sm tracking-tight">{title}</h2>
					{description ? (
						<p className="max-w-prose text-muted-foreground text-xs leading-relaxed">
							{description}
						</p>
					) : null}
				</div>
				{action}
			</header>
			{children}
		</section>
	);
}
