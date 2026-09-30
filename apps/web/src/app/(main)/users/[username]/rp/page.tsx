import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { UserRpHistory } from "@/components/blocks/user-rp-history";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

const loadUser = cache((username: string) =>
	orpc.user.getUserByUsername.call({ username }),
);

const loadChart = cache((username: string) =>
	orpc.rp.getRpChart.call({ username }),
);

const loadEvents = cache((username: string) =>
	orpc.rp.getRpEventList.call({ username, limit: 20 }),
);

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/rp">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUser(username);

		return buildPageMetadata({
			title: `${user.name} · RP history`,
			description: `Reading points history for ${user.name}.`,
			path: `/users/${user.username}/rp`,
		});
	} catch {
		return buildNotFoundMetadata("RP history");
	}
}

export default async function UserRpHistoryPage({
	params,
}: PageProps<"/users/[username]/rp">) {
	const { username } = await params;

	try {
		const [user, chart, initialEvents] = await Promise.all([
			loadUser(username),
			loadChart(username),
			loadEvents(username),
		]);

		return (
			<UserRpHistory user={user} chart={chart} initialEvents={initialEvents} />
		);
	} catch {
		notFound();
	}
}
