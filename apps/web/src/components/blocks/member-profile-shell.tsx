import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { MemberProfileFavorites } from "@/components/blocks/member-profile-favorites";
import { MemberProfileHeader } from "@/components/blocks/member-profile-header";
import { MemberProfileNav } from "@/components/blocks/member-profile-nav";

type MemberProfileShellProps = {
	user: GetUserByUsernameOutput;
	isOwnProfile?: boolean;
	children: React.ReactNode;
};

export function MemberProfileShell({
	user,
	isOwnProfile = false,
	children,
}: MemberProfileShellProps) {
	return (
		<div className="flex flex-col gap-8">
			<MemberProfileHeader
				user={user}
				isOwnProfile={isOwnProfile}
				favoritesHighlight={<MemberProfileFavorites username={user.username} />}
			/>
			<MemberProfileNav isOwnProfile={isOwnProfile} username={user.username} />
			<div className="min-w-0">{children}</div>
		</div>
	);
}
