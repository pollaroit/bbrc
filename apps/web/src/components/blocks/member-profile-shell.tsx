import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { MemberProfileFavorites } from "@/components/blocks/member-profile-favorites";
import { MemberProfileHeader } from "@/components/blocks/member-profile-header";
import { MemberProfileNav } from "@/components/blocks/member-profile-nav";

type MemberProfileShellProps = {
	user: GetUserByUsernameOutput;
	children: React.ReactNode;
};

export function MemberProfileShell({
	user,
	children,
}: MemberProfileShellProps) {
	return (
		<div className="flex flex-col gap-8">
			<MemberProfileHeader user={user} />
			<MemberProfileFavorites username={user.username} />
			<MemberProfileNav username={user.username} />
			<div>{children}</div>
		</div>
	);
}
