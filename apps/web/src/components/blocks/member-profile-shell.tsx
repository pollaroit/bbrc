"use client";

import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { useQuery } from "@tanstack/react-query";
import { LockedProfile } from "@/components/blocks/locked-profile";
import { MemberProfileFavorites } from "@/components/blocks/member-profile-favorites";
import { MemberProfileHeader } from "@/components/blocks/member-profile-header";
import { MemberProfileNav } from "@/components/blocks/member-profile-nav";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

type MemberProfileShellProps = {
	user: GetUserByUsernameOutput;
	children: React.ReactNode;
};

export function MemberProfileShell({
	user: cachedUser,
	children,
}: MemberProfileShellProps) {
	const { data: session } = authClient.useSession();
	const isOwnProfile = session?.user?.username === cachedUser.username;

	// The page is cached and was built for an anonymous visitor, so a private profile reads as
	// closed. A signed-in member who may see it (a friend, an admin) gets the real answer here.
	const askAsViewer =
		cachedUser.canViewProfile === false &&
		Boolean(session?.user) &&
		!isOwnProfile;
	const viewerQuery = useQuery({
		...orpc.user.getUserByUsername.queryOptions({
			input: { username: cachedUser.username },
		}),
		enabled: askAsViewer,
		staleTime: 60_000,
	});
	const user = askAsViewer && viewerQuery.data ? viewerQuery.data : cachedUser;
	const checkingAccess = askAsViewer && viewerQuery.isPending;
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
			) : checkingAccess ? (
				<div
					className="h-48 animate-pulse border border-border bg-muted/30"
					aria-hidden
				/>
			) : (
				<LockedProfile name={user.name} />
			)}
		</div>
	);
}
