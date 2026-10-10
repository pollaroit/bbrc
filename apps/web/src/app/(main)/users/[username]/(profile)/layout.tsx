import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MemberProfileShell } from "@/components/blocks/member-profile-shell";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import { JsonLd, personJsonLd } from "@/lib/seo";
import { auth } from "@/services";

export default async function UserProfileLayout({
	children,
	params,
}: LayoutProps<"/users/[username]">) {
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
				<MemberProfileShell isOwnProfile={isOwnProfile} user={user}>
					{children}
				</MemberProfileShell>
			</>
		);
	} catch {
		notFound();
	}
}
