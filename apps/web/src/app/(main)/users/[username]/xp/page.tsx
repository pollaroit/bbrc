import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { UserXpHistory } from "@/components/blocks/user-xp-history";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
import { orpc } from "@/utils/orpc";

const loadUser = cache((username: string) =>
	orpc.user.getUserByUsername.call({ username }),
);

const loadChart = cache((username: string) =>
	orpc.xp.getXpChart.call({ username }),
);

const loadEvents = cache((username: string) =>
	orpc.xp.getXpEventList.call({ username, limit: 20 }),
);

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/xp">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUser(username);

		return buildPageMetadata({
			title: `${user.name} · XP history`,
			description: `Experience points history for ${user.name}.`,
			path: `/users/${user.username}/xp`,
		});
	} catch {
		return buildNotFoundMetadata("XP history");
	}
}

export default async function UserXpHistoryPage({
	params,
}: PageProps<"/users/[username]/xp">) {
	const { username } = await params;

	try {
		const [user, chart, initialEvents] = await Promise.all([
			loadUser(username),
			loadChart(username),
			loadEvents(username),
		]);

		return (
			<UserXpHistory user={user} chart={chart} initialEvents={initialEvents} />
		);
	} catch {
		notFound();
	}
}
