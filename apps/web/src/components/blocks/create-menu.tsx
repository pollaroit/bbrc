"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Plus } from "lucide-react";
import { CreateMenuItems } from "@/components/blocks/create-menu-items";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type CreateMenuProps = {
	variant?: "header" | "fab";
	className?: string;
};

export function CreateMenu({ variant = "header", className }: CreateMenuProps) {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();

	if (isSessionPending || !session?.user) {
		return null;
	}

	if (variant === "fab") {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							size="icon"
							aria-label="Create"
							className={cn(
								"size-14 border-2 border-background bg-primary text-primary-foreground shadow-none ring-1 ring-border",
								"-translate-y-3",
								className,
							)}
						/>
					}
				>
					<Plus className="size-7 stroke-[2.25]" aria-hidden="true" />
				</DropdownMenuTrigger>
				<DropdownMenuContent
					side="top"
					align="center"
					sideOffset={12}
					className="min-w-48"
				>
					<CreateMenuItems />
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<Button type="button" size="sm" aria-label="Create" />}
			>
				<Plus data-icon="inline-start" aria-hidden="true" />
				Create
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-44">
				<CreateMenuItems />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** @deprecated Use `CreateMenu` — kept for existing imports. */
export const AdminCreateMenu = CreateMenu;
