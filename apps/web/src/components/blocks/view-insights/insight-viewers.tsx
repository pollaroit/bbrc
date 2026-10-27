import type { ViewInsights } from "@bbrc/api/modules/view/view.schema";
import type { Route } from "next";
import { RelativeTime } from "@/components/blocks/relative-time";
import { UserPanel } from "@/components/blocks/user-panel";
import { Link } from "@/i18n/navigation";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { formatCount } from "./insight-format";
import { InsightPanel } from "./insight-panel";

type Viewer = NonNullable<ViewInsights["topViewers"]>[number];

function ViewerList({
	viewers,
	show,
}: {
	viewers: Viewer[];
	show: "views" | "recent";
}) {
	const f = useFormatters();
	if (viewers.length === 0) {
		return <p className="text-muted-foreground text-sm">No members yet.</p>;
	}
	return (
		<ul className="flex flex-col gap-2">
			{viewers.map((viewer) => (
				<li
					key={viewer.username}
					className="flex items-center justify-between gap-3 border border-border px-2 py-1.5"
				>
					<Link
						href={`/users/${viewer.username}` as Route}
						className="min-w-0 outline-offset-2"
					>
						<UserPanel user={viewer} className="min-w-0" />
					</Link>
					<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
						{show === "views" ? (
							`${formatCount(f, viewer.views)} ${viewer.views === 1 ? "open" : "opens"}`
						) : (
							<RelativeTime date={viewer.lastSeenAt} />
						)}
					</span>
				</li>
			))}
		</ul>
	);
}

/** Named members who opened it. Only shown to people allowed to see names. */
export function InsightViewers({
	top,
	recent,
}: {
	top: Viewer[];
	recent: Viewer[];
}) {
	return (
		<div className="grid gap-4 md:grid-cols-2">
			<InsightPanel
				title="Most opens"
				description="Signed-in members who opened it the most, ever. Guests are not named."
			>
				<ViewerList viewers={top} show="views" />
			</InsightPanel>
			<InsightPanel
				title="Latest viewers"
				description="Who opened it most recently."
			>
				<ViewerList viewers={recent} show="recent" />
			</InsightPanel>
		</div>
	);
}
