import type { GetBookListOutput } from "@bbrc/api/modules/book/book.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { cn } from "@/lib/utils";

export type BookStatus = GetBookListOutput["items"][number]["status"];

const statusBadgeClassName: Record<BookStatus, string> = {
	completed:
		"border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
	reading: "border-sky-600/30 bg-sky-600/10 text-sky-900 dark:text-sky-300",
	wishlist:
		"border-violet-600/30 bg-violet-600/10 text-violet-900 dark:text-violet-300",
};

const statusBannerClassName: Record<BookStatus, string> = {
	completed: "border-l-emerald-600 bg-emerald-600/5 dark:bg-emerald-950/20",
	reading: "border-l-sky-600 bg-sky-600/5 dark:bg-sky-950/20",
	wishlist: "border-l-violet-600 bg-violet-600/5 dark:bg-violet-950/20",
};

export const statusSpineClassName: Record<BookStatus, string> = {
	completed: "bg-emerald-600",
	reading: "bg-sky-600",
	wishlist: "bg-violet-600",
};

const statusStripClassName: Record<BookStatus, string> = {
	completed: "bg-emerald-600/10 text-emerald-900 dark:text-emerald-200",
	reading: "bg-sky-600/10 text-sky-950 dark:text-sky-200",
	wishlist: "bg-violet-600/10 text-violet-950 dark:text-violet-200",
};

const statusDescription: Record<BookStatus, string> = {
	completed: "The club has finished reading this title.",
	reading: "This book is in an active club read.",
	wishlist: "Queued for a future sitting or vote.",
};

export function formatBookStatusLabel(status: BookStatus) {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export function BookStatusBadge({ status }: { status: BookStatus }) {
	return (
		<Badge variant="outline" className={statusBadgeClassName[status]}>
			{formatBookStatusLabel(status)}
		</Badge>
	);
}

/** Detail header: global club status for the catalog entry. */
export function BookStatusBanner({ status }: { status: BookStatus }) {
	return (
		<div
			className={cn(
				"border border-border border-l-4 px-4 py-3",
				statusBannerClassName[status],
			)}
		>
			<p className="font-semibold text-base leading-snug">
				{formatBookStatusLabel(status)}
			</p>
			<p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-relaxed">
				{statusDescription[status]}
			</p>
		</div>
	);
}

/** List card: visible club status without crowding actions. */
export function BookStatusStrip({ status }: { status: BookStatus }) {
	return (
		<div
			className={cn(
				"border-border border-b px-3 py-1.5 font-medium text-xs",
				statusStripClassName[status],
			)}
		>
			{formatBookStatusLabel(status)}
		</div>
	);
}
