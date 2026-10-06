import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@bbrc/ui/components/avatar";
import { cn } from "@/lib/utils";

type UserAvatarUser = {
	name: string;
	image?: string | null;
};

type UserAvatarProps = {
	user: UserAvatarUser;
	className?: string;
};

export function UserAvatar({ user, className }: UserAvatarProps) {
	return (
		<Avatar className={cn("size-10", className)}>
			<AvatarImage
				key={user.image ?? "no-image"}
				src={user.image ?? undefined}
			/>
			<AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
		</Avatar>
	);
}
