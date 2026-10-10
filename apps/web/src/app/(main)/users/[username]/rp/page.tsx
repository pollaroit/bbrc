import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UserRpHistory } from "@/components/blocks/user-rp-history";
import {
	loadRpChartForPage,
	loadRpEventListForPage,
	loadUserByUsernameForPage,
} from "@/lib/member-profile-data";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]/rp">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

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
			loadUserByUsernameForPage(username),
			loadRpChartForPage(username),
			loadRpEventListForPage(username),
		]);

		return (
			<UserRpHistory user={user} chart={chart} initialEvents={initialEvents} />
		);
	} catch {
		notFound();
	}
}
