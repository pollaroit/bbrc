"use client";

import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { LockedProfile } from "@/components/blocks/locked-profile";
import { MemberProfileFavorites } from "@/components/blocks/member-profile-favorites";
import { MemberProfileHeader } from "@/components/blocks/member-profile-header";
import { MemberProfileNav } from "@/components/blocks/member-profile-nav";
import { authClient } from "@/lib/auth-client";

type MemberProfileShellProps = {
	user: GetUserByUsernameOutput;
	children: React.ReactNode;
};

export function MemberProfileShell({
	user,
	children,
}: MemberProfileShellProps) {
	const { data: session } = authClient.useSession();
	const isOwnProfile = session?.user?.username === user.username;
	const canView = isOwnProfile || user.canViewProfile !== false;

	return (
		<div className="flex flex-col gap-8">
			<MemberProfileHeader
				user={user}
				isOwnProfile={isOwnProfile}
				favoritesHighlight={<MemberProfileFavorites username={user.username} />}
			/>
			{canView ? (
				<>
					<MemberProfileNav
						isOwnProfile={isOwnProfile}
						username={user.username}
					/>
					<div className="min-w-0">{children}</div>
				</>
			) : (
				<LockedProfile name={user.name} />
			)}
		</div>
	);
}
