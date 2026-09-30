import type { Metadata } from "next";
import { cache } from "react";
import { UserProfile } from "@/components/blocks/user-profile";
import { orpc } from "@/utils/orpc";

const loadUserByUsername = cache((username: string) =>
	orpc.user.getUserByUsername.call({ username }),
);

export async function generateMetadata({
	params,
}: PageProps<"/users/[username]">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsername(username);

		return {
			title: `${user.name} (@${user.username})`,
			description: `View ${user.name}'s profile on the BBRC.`,
		};
	} catch {
		return {
			title: "User not found",
			description: "This member profile could not be found.",
		};
	}
}

export default async function UserPage({
	params,
}: PageProps<"/users/[username]">) {
	const { username } = await params;
	const user = await loadUserByUsername(username);

	return <UserProfile user={user} />;
}
