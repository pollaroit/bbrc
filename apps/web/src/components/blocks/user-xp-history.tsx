import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import type {
	GetXpChartOutput,
	GetXpEventListOutput,
} from "@bbrc/api/modules/xp/xp.schema";
import type { Route } from "next";
import { PointsHistoryChart } from "@/components/blocks/points-history-chart";
import { UserPointsHistoryHeader } from "@/components/blocks/user-points-history-header";
import { UserXpEventsList } from "@/components/blocks/user-xp-events-list";

type UserXpHistoryProps = {
	user: GetUserByUsernameOutput;
	chart: GetXpChartOutput;
	initialEvents: GetXpEventListOutput;
};

export function UserXpHistory({
	user,
	chart,
	initialEvents,
}: UserXpHistoryProps) {
	const profileHref = `/users/${user.username}` as Route;

	return (
		<div className="flex flex-col gap-8">
			<UserPointsHistoryHeader
				user={user}
				metric="XP"
				profileHref={profileHref}
			/>
			<PointsHistoryChart
				metricLabel="XP"
				currentTotal={chart.currentTotal}
				points={chart.points}
			/>
			<UserXpEventsList username={user.username} initialPage={initialEvents} />
		</div>
	);
}
