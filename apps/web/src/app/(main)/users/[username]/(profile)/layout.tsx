import { notFound } from "next/navigation";
import { MemberProfileShell } from "@/components/blocks/member-profile-shell";
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
				<MemberProfileShell user={user}>{children}</MemberProfileShell>
			</>
		);
	} catch {
		notFound();
	}
}
