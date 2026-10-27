import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import { UserPanel } from "@/components/blocks/user-panel";
import { Link } from "@/i18n/navigation";

type UserPointsHistoryHeaderProps = {
	user: GetUserByUsernameOutput;
	metric: "RP" | "XP";
	profileHref: Route;
};

export function UserPointsHistoryHeader({
	user,
	metric,
	profileHref,
}: UserPointsHistoryHeaderProps) {
	return (
		<div className="flex flex-col gap-4">
			<Link
				href={profileHref}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" />
				Back to profile
			</Link>
			<div className="flex flex-col gap-1">
				<h1 className="font-bold text-2xl tracking-tight">{metric} history</h1>
				<UserPanel user={user} className="min-w-0 items-start" />
			</div>
		</div>
	);
}
