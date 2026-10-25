import { cn } from "@/lib/utils";

/** A titled block of the edition page. */
export function EditionSection({
	id,
	title,
	description,
	aside,
	children,
	className,
}: {
	id: string;
	title: string;
	description?: string;
	/** Something small at the right of the heading (a count, a link). */
	aside?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section
			aria-labelledby={`${id}-title`}
			className={cn("flex flex-col gap-4", className)}
		>
			<div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-border border-b pb-2">
				<div className="flex min-w-0 flex-col gap-0.5">
					<h2
						id={`${id}-title`}
						className="font-semibold text-lg tracking-tight"
					>
						{title}
					</h2>
					{description ? (
						<p className="max-w-prose text-muted-foreground text-sm">
							{description}
						</p>
					) : null}
				</div>
				{aside}
			</div>
			{children}
		</section>
	);
}
