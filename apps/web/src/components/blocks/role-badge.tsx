"use client";

import { isRole, ROLE_META, type Role, roleOf } from "@bbrc/shared";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** The theme tokens each role's tone maps to. Spelled out so Tailwind can see every class. */
const TONE_CLASSES = {
	info: "border-info/30 bg-info/10 text-info-ink",
	violet: "border-violet/30 bg-violet/10 text-violet-ink",
	warning: "border-warning/30 bg-warning/10 text-warning-ink",
} as const;

const SIZES = {
	sm: { tile: "size-5", icon: "size-3" },
	md: { tile: "size-6", icon: "size-3.5" },
	lg: { tile: "size-7", icon: "size-4" },
} as const;

/**
 * A small icon tile for a member who is more than a member: one shield for the
 * three staff roles, told apart by colour, with the role named in a tooltip.
 * Draws nothing for an ordinary member, so it can sit next to any name.
 */
export function RoleBadge({
	role,
	size = "md",
	className,
}: {
	role: Role | string | null | undefined;
	size?: keyof typeof SIZES;
	className?: string;
}) {
	const resolved = isRole(role) ? role : roleOf(role);
	const meta = ROLE_META[resolved];
	if (!meta.tone) return null;
	const sizes = SIZES[size];

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<span
						role="img"
						aria-label={meta.label}
						className={cn(
							"inline-flex shrink-0 items-center justify-center border",
							TONE_CLASSES[meta.tone],
							sizes.tile,
							className,
						)}
					/>
				}
			>
				<ShieldCheck className={sizes.icon} aria-hidden />
			</TooltipTrigger>
			<TooltipContent side="bottom">
				<span className="font-medium">{meta.label}</span>
				<span className="block opacity-80">{meta.description}</span>
			</TooltipContent>
		</Tooltip>
	);
}
