"use client";

import { Button } from "@bbrc/ui/components/button";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ListingToggleChipProps = {
	pressed: boolean;
	onPressedChange: (pressed: boolean) => void;
	icon?: ReactNode;
	children: ReactNode;
	className?: string;
};

/** On/off filter shown as a button that looks selected while active. */
export function ListingToggleChip({
	pressed,
	onPressedChange,
	icon,
	children,
	className,
}: ListingToggleChipProps) {
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			aria-pressed={pressed}
			className={cn(
				"gap-1.5",
				pressed &&
					"border-primary bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
				className,
			)}
			onClick={() => onPressedChange(!pressed)}
		>
			{icon}
			{children}
		</Button>
	);
}
