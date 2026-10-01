import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UserXpHistory } from "@/components/blocks/user-xp-history";
import {
	loadUserByUsernameForIsr,
	loadXpChartForIsr,
	loadXpEventListForIsr,
} from "@/lib/isr-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/xp">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForIsr(username);

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
			loadUserByUsernameForIsr(username),
			loadXpChartForIsr(username),
			loadXpEventListForIsr(username),
		]);

		return (
			<UserXpHistory user={user} chart={chart} initialEvents={initialEvents} />
		);
	} catch {
		notFound();
	}
}
