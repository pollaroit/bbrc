import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@bbrc/ui/components/avatar";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type User = {
	name: string;
	username: string;
	image?: string | null;
	isAdmin?: boolean;
};

interface Props {
	user: User;

	hideAvatar?: boolean;

	renderTitle?: boolean | string | ReactNode | ((user: User) => ReactNode);
	renderDescription?: boolean | string | ((user: User) => string);

	className?: string;
	contentClassName?: string;
	imageClassName?: string;
	titleClassName?: string;
	descriptionClassName?: string;
}

export function UserPanel({
	user,
	hideAvatar = false,
	renderTitle = true,
	renderDescription = true,
	className,
	contentClassName,
	titleClassName,
	descriptionClassName,
	imageClassName,
}: Props) {
	return (
		<div className={cn("flex items-center gap-2", className)}>
			{!hideAvatar && (
				<Avatar className={imageClassName}>
					<AvatarImage
						key={user.image ?? "no-image"}
						src={user.image ?? undefined}
					/>
					<AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
				</Avatar>
			)}

			<div
				className={cn(
					"flex flex-col items-start gap-0 text-left",
					contentClassName,
				)}
			>
				{renderTitle === false ? null : renderTitle === true ||
					renderTitle === undefined ? (
					<p className={cn("font-medium text-sm", titleClassName)}>
						{user.name}
					</p>
				) : typeof renderTitle === "string" ? (
					<p className={cn("font-medium text-sm", titleClassName)}>
						{renderTitle}
					</p>
				) : typeof renderTitle === "function" ? (
					renderTitle(user)
				) : (
					renderTitle
				)}
				{renderDescription === false ? null : renderDescription === true ||
					renderDescription === undefined ? (
					<p
						className={cn(
							"text-muted-foreground text-xs",
							descriptionClassName,
						)}
					>
						@{user.username}
					</p>
				) : typeof renderDescription === "string" ? (
					renderDescription
				) : (
					renderDescription(user)
				)}
			</div>
		</div>
	);
}
