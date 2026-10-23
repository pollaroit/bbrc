import type { GetBookListOutput } from "@bbrc/api/modules/book/book.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { cn } from "@/lib/utils";

export type BookStatus = GetBookListOutput["items"][number]["status"];

const statusBadgeClassName: Record<BookStatus, string> = {
	completed: "border-success/30 bg-success/10 text-success-ink",
	reading: "border-info/30 bg-info/10 text-info-ink",
	wishlist: "border-violet/30 bg-violet/10 text-violet-ink",
};

const statusBannerClassName: Record<BookStatus, string> = {
	completed: "border-l-success bg-success/5",
	reading: "border-l-info bg-info/5",
	wishlist: "border-l-violet bg-violet/5",
};

export const statusSpineClassName: Record<BookStatus, string> = {
	completed: "bg-success",
	reading: "bg-info",
	wishlist: "bg-violet",
};

const statusStripClassName: Record<BookStatus, string> = {
	completed: "bg-success/10 text-success-ink",
	reading: "bg-info/10 text-info-ink",
	wishlist: "bg-violet/10 text-violet-ink",
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
