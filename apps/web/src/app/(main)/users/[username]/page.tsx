import type { Metadata } from "next";
import { cache } from "react";
import { UserProfile } from "@/components/blocks/user-profile";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	DETAIL_PAGE_REVALIDATE_SECONDS,
	JsonLd,
	personJsonLd,
	usernameStaticParams,
} from "@/lib/seo";
import { db } from "@/services";
import { orpc } from "@/utils/orpc";

export const revalidate = DETAIL_PAGE_REVALIDATE_SECONDS;
export const dynamicParams = true;

export async function generateStaticParams() {
	return usernameStaticParams(db);
}

const loadUserByUsername = cache((username: string) =>
	orpc.user.getUserByUsername.call({ username }),
);

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsername(username);

		return buildPageMetadata({
			title: `${user.name} (@${user.username})`,
			description: `${user.name}'s profile, readings, XP, and RP on BBRC.`,
			path: `/users/${user.username}`,
			openGraph: { type: "profile" },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserPage({
	params,
}: PageProps<"/users/[username]">) {
	const { username } = await params;
	const user = await loadUserByUsername(username);

	return (
		<>
			<JsonLd
				data={personJsonLd({ name: user.name, username: user.username })}
			/>
			<UserProfile user={user} />
		</>
	);
}
