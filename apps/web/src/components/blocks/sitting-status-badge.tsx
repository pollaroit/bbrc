import { sittingStatusFilterLabels } from "@bbrc/api/modules/sitting/sitting.listing";
import type { GetSittingListOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Badge } from "@bbrc/ui/components/badge";

export type SittingStatus = GetSittingListOutput["items"][number]["status"];

const statusBadgeClassName: Record<SittingStatus, string> = {
	voting:
		"border-amber-600/30 bg-amber-600/10 text-amber-900 dark:text-amber-300",
	reading: "border-sky-600/30 bg-sky-600/10 text-sky-900 dark:text-sky-300",
	finished:
		"border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
};

export function SittingStatusBadge({ status }: { status: SittingStatus }) {
	return (
		<Badge variant="outline" className={statusBadgeClassName[status]}>
			{sittingStatusFilterLabels[status]}
		</Badge>
	);
}
