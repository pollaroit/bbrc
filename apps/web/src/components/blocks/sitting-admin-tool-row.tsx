import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SittingAdminToolRowProps = {
	icon: ReactNode;
	title: string;
	description: ReactNode;
	/** The row's action button(s). */
	children: ReactNode;
	className?: string;
};

/** One admin action: what it does on the left, its button on the right. */
export function SittingAdminToolRow({
	icon,
	title,
	description,
	children,
	className,
}: SittingAdminToolRowProps) {
	return (
		<li
			className={cn(
				"flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
				className,
			)}
		>
			<div className="flex min-w-0 items-start gap-3">
				<span className="mt-0.5 shrink-0 text-muted-foreground [&_svg]:size-4">
					{icon}
				</span>
				<div className="min-w-0">
					<p className="font-medium text-sm">{title}</p>
					<p className="text-muted-foreground text-xs leading-relaxed">
						{description}
					</p>
				</div>
			</div>
			{/* pl-7 lines the button up with the text, past the 1rem icon and its gap */}
			<div className="flex shrink-0 flex-wrap gap-2 pl-7 sm:pl-0">
				{children}
			</div>
		</li>
	);
}
