import type { GetBookListOutput } from "@bbrc/api/modules/book/book.schema";
import { Badge } from "@bbrc/ui/components/badge";

export type BookStatus = GetBookListOutput["items"][number]["status"];

const statusBadgeClassName: Record<BookStatus, string> = {
	completed:
		"border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
	reading: "border-sky-600/30 bg-sky-600/10 text-sky-900 dark:text-sky-300",
	wishlist:
		"border-violet-600/30 bg-violet-600/10 text-violet-900 dark:text-violet-300",
};

function formatStatusLabel(status: BookStatus) {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export function BookStatusBadge({ status }: { status: BookStatus }) {
	return (
		<Badge variant="outline" className={statusBadgeClassName[status]}>
			{formatStatusLabel(status)}
		</Badge>
	);
}
