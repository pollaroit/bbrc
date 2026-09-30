import type {
	GetRpChartOutput,
	GetRpEventListOutput,
} from "@bbrc/api/modules/rp/rp.schema";
import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import type { Route } from "next";
import { PointsHistoryChart } from "@/components/blocks/points-history-chart";
import { UserPointsHistoryHeader } from "@/components/blocks/user-points-history-header";
import { UserRpEventsList } from "@/components/blocks/user-rp-events-list";

type UserRpHistoryProps = {
	user: GetUserByUsernameOutput;
	chart: GetRpChartOutput;
	initialEvents: GetRpEventListOutput;
};

export function UserRpHistory({
	user,
	chart,
	initialEvents,
}: UserRpHistoryProps) {
	const profileHref = `/users/${user.username}` as Route;

	return (
		<div className="flex flex-col gap-8">
			<UserPointsHistoryHeader
				user={user}
				metric="RP"
				profileHref={profileHref}
			/>
			<PointsHistoryChart
				metricLabel="RP"
				currentTotal={chart.currentTotal}
				points={chart.points}
			/>
			<UserRpEventsList username={user.username} initialPage={initialEvents} />
		</div>
	);
}
