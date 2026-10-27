"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateMenuItems } from "@/components/blocks/create-menu-items";
import { CreateMenuSheet } from "@/components/blocks/create-menu-sheet";
import { authClient } from "@/lib/auth-client";
import { headerToolbarControlClass } from "@/lib/header-toolbar";
import { cn } from "@/lib/utils";

type CreateMenuProps = {
	variant?: "header" | "fab";
	className?: string;
};

export function CreateMenu({ variant = "header", className }: CreateMenuProps) {
	const t = useTranslations("shell.create");
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const [sheetOpen, setSheetOpen] = useState(false);

	if (isSessionPending || !session?.user) {
		return null;
	}

	if (variant === "fab") {
		return (
			<>
				<button
					type="button"
					aria-label={t("title")}
					onClick={() => setSheetOpen(true)}
					className={cn(
						"flex size-[3.25rem] items-center justify-center border-2 border-background bg-primary text-primary-foreground shadow-none ring-1 ring-border transition-transform active:scale-95",
						"-translate-y-2",
						className,
					)}
				>
					<Plus className="size-6 stroke-[2.25]" aria-hidden="true" />
				</button>
				<CreateMenuSheet open={sheetOpen} onOpenChange={setSheetOpen} />
			</>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						size="sm"
						className={headerToolbarControlClass}
						aria-label={t("title")}
					/>
				}
			>
				<Plus data-icon="inline-start" aria-hidden="true" />
				{t("title")}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-44">
				<CreateMenuItems />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** @deprecated Use `CreateMenu` — kept for existing imports. */
export const AdminCreateMenu = CreateMenu;
