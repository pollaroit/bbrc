import { notFound } from "next/navigation";
import { MemberProfileShell } from "@/components/blocks/member-profile-shell";
import { TrackDetailView } from "@/components/blocks/track-detail-view";
import { loadUserByUsernameForIsr } from "@/lib/isr-data";
import { JsonLd, personJsonLd } from "@/lib/seo";

export default async function UserProfileLayout({
	children,
	params,
}: LayoutProps<"/users/[username]">) {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForIsr(username);

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
				<MemberProfileShell user={user}>{children}</MemberProfileShell>
			</>
		);
	} catch {
		notFound();
	}
}
