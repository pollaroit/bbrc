import type { ReactNode } from "react";

/**
 * The chrome of every page of one book: the masthead stage, the sticky bar of
 * section tabs, then the page itself at the full width of the column.
 */
export function BookDetailShell({
	masthead,
	nav,
	children,
}: {
	masthead: ReactNode;
	nav: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="flex min-w-0 flex-col gap-6">
			{masthead}
			{nav}
			<div className="min-w-0">{children}</div>
		</div>
	);
}
