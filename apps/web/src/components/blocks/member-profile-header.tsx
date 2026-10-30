import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@bbrc/ui/components/avatar";
import { Button } from "@bbrc/ui/components/button";
import { Crown, Lock, Pencil } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { FriendButton } from "@/components/blocks/friend-button";
import { MemberProfileAbout } from "@/components/blocks/member-profile-about";
import { MemberProfileCardDialog } from "@/components/blocks/member-profile-card-dialog";
import { MemberProfileNumbers } from "@/components/blocks/member-profile-numbers";
import { PinnedAchievements } from "@/components/blocks/pinned-achievements";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { CompareWithButton } from "@/components/blocks/user-compare/compare-with-button";
import { UserStatusBadge } from "@/components/blocks/user-status-badge";

type MemberProfileHeaderProps = {
	user: GetUserByUsernameOutput;
	isOwnProfile?: boolean;
	favoritesHighlight?: React.ReactNode;
};

export function MemberProfileHeader({
	user,
	isOwnProfile = false,
	favoritesHighlight,
}: MemberProfileHeaderProps) {
	// A private profile is closed to non-friends: only the identity shows.
	const canView = isOwnProfile || user.canViewProfile !== false;
	return (
		<header className="flex flex-col gap-6">
			<div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem] md:gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					<div className="flex items-start gap-4">
						<Avatar className="size-20 shrink-0 text-2xl sm:size-24 sm:text-3xl">
							<AvatarImage
								key={user.image ?? "no-image"}
								src={user.image ?? undefined}
							/>
							<AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col gap-2">
							<div className="flex items-start justify-between gap-2">
								<h1 className="flex min-w-0 items-center gap-2 font-semibold text-xl tracking-tight sm:text-2xl">
									<span className="truncate">{user.name}</span>
									{user.isAdmin ? (
										<Crown
											className="size-5 shrink-0 text-warning"
											aria-label="Administrator"
										/>
									) : null}
								</h1>
								<div className="flex shrink-0 divide-x divide-border border border-border">
									<ResourceShareMenu
										path={`/users/${user.username}`}
										shareText={user.name}
										label="Share member profile"
										shareInPost={{ kind: "user", username: user.username }}
										size="md"
										iconOnly
										triggerClassName="size-8 px-0 text-foreground"
									/>
									<MemberProfileCardDialog
										user={user}
										iconOnly
										triggerClassName="size-8 text-foreground"
									/>
								</div>
							</div>
							<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-sm">
								@{user.username}
								{user.isPrivate ? (
									<span className="inline-flex items-center gap-1 border border-border px-1.5 py-0.5 text-xs">
										<Lock className="size-3" aria-hidden />
										Private
									</span>
								) : null}
								{user.status !== "active" ? (
									<UserStatusBadge status={user.status} />
								) : null}
								<span className="tabular-nums">
									{user.friendCount ?? 0}{" "}
									{(user.friendCount ?? 0) === 1 ? "friend" : "friends"}
								</span>
							</p>
							{isOwnProfile ? (
								<Button
									variant="outline"
									size="sm"
									className="mt-1 w-fit"
									nativeButton={false}
									render={<Link href={"/settings/profile" as Route} />}
								>
									<Pencil data-icon="inline-start" aria-hidden />
									Edit profile
								</Button>
							) : (
								<div className="mt-1 flex flex-wrap items-center gap-2">
									<FriendButton username={user.username} />
									{canView ? (
										<CompareWithButton
											username={user.username}
											name={user.name}
											className="w-fit"
										/>
									) : null}
								</div>
							)}
						</div>
					</div>

					{canView ? <PinnedAchievements username={user.username} /> : null}

					<MemberProfileAbout
						profile={user.profile}
						isOwnProfile={isOwnProfile}
					/>
				</div>

				{canView ? (
					<MemberProfileNumbers user={user} className="md:self-start" />
				) : null}
			</div>

			{canView ? (
				<div className="grid gap-6 empty:hidden">{favoritesHighlight}</div>
			) : null}
		</header>
	);
}
