import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@bbrc/ui/components/avatar";
import { Button } from "@bbrc/ui/components/button";
import { Crown, Pencil } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { MemberProfileAbout } from "@/components/blocks/member-profile-about";
import { MemberProfileCardDialog } from "@/components/blocks/member-profile-card-dialog";
import { MemberProfileNumbers } from "@/components/blocks/member-profile-numbers";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { UserStatusBadge } from "@/components/blocks/user-status-badge";

type MemberProfileHeaderProps = {
	user: GetUserByUsernameOutput;
	isOwnProfile?: boolean;
	favoritesHighlight?: React.ReactNode;
	recentReadsHighlight?: React.ReactNode;
};

export function MemberProfileHeader({
	user,
	isOwnProfile = false,
	favoritesHighlight,
	recentReadsHighlight,
}: MemberProfileHeaderProps) {
	return (
		<header className="flex flex-col gap-6">
			<Link
				href={"/leaderboard/overview" as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<span aria-hidden className="text-base leading-none">
					←
				</span>
				Leaderboard
			</Link>

			<div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem] md:gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					<div className="flex items-start gap-4">
						<Avatar className="size-20 text-2xl sm:size-24 sm:text-3xl">
							<AvatarImage
								key={user.image ?? "no-image"}
								src={user.image ?? undefined}
							/>
							<AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
						</Avatar>
						<div className="flex min-w-0 flex-1 flex-col gap-3">
							<div className="min-w-0">
								<h1 className="flex min-w-0 items-center gap-2 font-semibold text-xl tracking-tight sm:text-2xl">
									<span className="truncate">{user.name}</span>
									{user.isAdmin ? (
										<Crown
											className="size-5 shrink-0 text-amber-600 dark:text-amber-400"
											aria-label="Administrator"
										/>
									) : null}
								</h1>
								<p className="text-muted-foreground text-sm">
									@{user.username}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								{user.status !== "active" ? (
									<UserStatusBadge status={user.status} />
								) : null}
								{isOwnProfile ? (
									<Button
										variant="outline"
										size="sm"
										nativeButton={false}
										render={<Link href={"/settings/profile" as Route} />}
									>
										<Pencil data-icon="inline-start" aria-hidden />
										Edit profile
									</Button>
								) : null}
								<ResourceShareMenu
									path={`/users/${user.username}`}
									shareText={user.name}
									label="Share member profile"
									shareInPost={{ kind: "user", username: user.username }}
									size="md"
								/>
								<MemberProfileCardDialog user={user} />
							</div>
						</div>
					</div>

					<MemberProfileAbout
						profile={user.profile}
						isOwnProfile={isOwnProfile}
					/>
				</div>

				<div className="flex flex-col gap-2 md:self-start">
					<MemberProfileNumbers user={user} />
					<Link
						href={`/users/${user.username}/stats` as Route}
						className="w-fit text-muted-foreground text-sm underline-offset-4 transition-colors hover:text-foreground hover:underline"
					>
						Detailed stats
					</Link>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-2 md:gap-8">
				{favoritesHighlight}
				{recentReadsHighlight}
			</div>
		</header>
	);
}
