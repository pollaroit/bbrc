import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { cn } from "@/lib/utils";

export type UserStatus = GetUserByUsernameOutput["status"];

const statusBadgeClassName: Record<UserStatus, string> = {
	active: "border-success/30 bg-success/10 text-success-ink",
	warned: "border-warning/30 bg-warning/10 text-warning-ink",
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
