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
};

export function MemberProfileHeader({
	user,
	isOwnProfile = false,
	favoritesHighlight,
}: MemberProfileHeaderProps) {
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
							<p className="flex items-center gap-2 text-muted-foreground text-sm">
								@{user.username}
								{user.status !== "active" ? (
									<UserStatusBadge status={user.status} />
								) : null}
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
							) : null}
						</div>
					</div>

					<MemberProfileAbout
						profile={user.profile}
						isOwnProfile={isOwnProfile}
					/>
				</div>

				<MemberProfileNumbers user={user} className="md:self-start" />
			</div>

			<div className="grid gap-6 empty:hidden">{favoritesHighlight}</div>
		</header>
	);
}
