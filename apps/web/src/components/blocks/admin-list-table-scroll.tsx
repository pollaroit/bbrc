import { cn } from "@/lib/utils";

type AdminListTableScrollProps = {
	children: React.ReactNode;
	className?: string;
};

/**
 * Horizontal scroll for wide admin tables on narrow viewports.
 * Keeps desktop layout unchanged; on mobile, swipe reveals all columns.
 */
export function AdminListTableScroll({
	children,
	className,
}: AdminListTableScrollProps) {
	return (
		<div
			className={cn(
				"w-full min-w-0 max-w-full touch-pan-x overflow-x-auto overscroll-x-contain",
				"max-md:[&_[data-slot=table-container]]:overflow-visible",
				"max-md:[&_th.hidden]:!table-cell max-md:[&_td.hidden]:!table-cell",
				className,
			)}
			style={{ WebkitOverflowScrolling: "touch" }}
		>
			{children}
		</div>
	);
}

/** Apply to `<Table>` so the grid is wider than the viewport below `md`. */
export const ADMIN_TABLE_MOBILE_MIN_WIDTH = "max-md:min-w-[64rem]";
