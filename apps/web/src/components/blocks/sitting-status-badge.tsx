import type { GetSittingListOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { useSittingStatusLabels } from "@/lib/i18n/use-labels";

export type SittingStatus = GetSittingListOutput["items"][number]["status"];

const statusBadgeClassName: Record<SittingStatus, string> = {
	voting: "border-warning/30 bg-warning/10 text-warning-ink",
	reading: "border-info/30 bg-info/10 text-info-ink",
	finished: "border-success/30 bg-success/10 text-success-ink",
};

export function SittingStatusBadge({ status }: { status: SittingStatus }) {
	const labels = useSittingStatusLabels();
	return (
		<Badge variant="outline" className={statusBadgeClassName[status]}>
			{labels[status]}
		</Badge>
	);
}
