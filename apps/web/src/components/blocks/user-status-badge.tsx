import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { cn } from "@/lib/utils";

export type UserStatus = GetUserByUsernameOutput["status"];

const statusBadgeClassName: Record<UserStatus, string> = {
	active:
		"border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300",
	warned:
		"border-amber-600/30 bg-amber-600/10 text-amber-900 dark:text-amber-300",
	banned: "border-destructive/40 bg-destructive/10 text-destructive",
};

function formatStatusLabel(status: UserStatus) {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export function UserStatusBadge({
	status,
	className,
}: {
	status: UserStatus;
	className?: string;
}) {
	return (
		<Badge
			variant="outline"
			className={cn(statusBadgeClassName[status], className)}
		>
			{formatStatusLabel(status)}
		</Badge>
	);
}
