import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MemberProfileShell } from "@/components/blocks/member-profile-shell";
import { TrackDetailView } from "@/components/blocks/track-detail-view";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { JsonLd, personJsonLd } from "@/lib/seo";
import { auth } from "@/services";

export default async function UserProfileLayout({
	children,
	params,
}: LayoutProps<"/[locale]/users/[username]">) {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const isOwnProfile = session?.user?.username === user.username;

		return (
			<>
				<JsonLd
					data={personJsonLd({ name: user.name, username: user.username })}
				/>
				{/* A shelf or goal opened from the profile is not a look at the profile. */}
				<TrackDetailView
					resource="user"
					itemRef={user.username}
					skipPathPrefixes={[
						`/users/${user.username}/shelves/`,
						`/users/${user.username}/goals/`,
					]}
				/>
				<MemberProfileShell isOwnProfile={isOwnProfile} user={user}>
					{children}
				</MemberProfileShell>
			</>
		);
	} catch {
		notFound();
	}
}
