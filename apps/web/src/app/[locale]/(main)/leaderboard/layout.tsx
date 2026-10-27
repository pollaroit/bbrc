import { LeaderboardPeriodNav } from "@/components/blocks/leaderboard-period-nav";
import { LeaderboardSubnav } from "@/components/blocks/leaderboard-subnav";

export default function LeaderboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
			<LeaderboardSubnav />
			<LeaderboardPeriodNav />
			{children}
		</div>
	);
}
