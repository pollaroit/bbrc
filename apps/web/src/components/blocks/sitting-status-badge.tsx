import { sittingStatusFilterLabels } from "@bbrc/api/modules/sitting/sitting.listing";
import type { GetSittingListOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Badge } from "@bbrc/ui/components/badge";

export type SittingStatus = GetSittingListOutput["items"][number]["status"];

const statusBadgeClassName: Record<SittingStatus, string> = {
	voting: "border-warning/30 bg-warning/10 text-warning-ink",
	reading: "border-info/30 bg-info/10 text-info-ink",
	finished: "border-success/30 bg-success/10 text-success-ink",
};

export function SittingStatusBadge({ status }: { status: SittingStatus }) {
	return (
		<Badge variant="outline" className={statusBadgeClassName[status]}>
			{sittingStatusFilterLabels[status]}
		</Badge>
	);
}
