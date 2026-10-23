"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { headerToolbarIconButtonClass } from "@/lib/header-toolbar";
import { useColorMode } from "@/lib/preferences/use-color-mode";

export function ModeToggle() {
	const { toggle } = useColorMode();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						type="button"
						className={`relative ${headerToolbarIconButtonClass}`}
						onClick={toggle}
						aria-label="Toggle light and dark theme"
					/>
				}
			>
				{mounted ? (
					<>
						<Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
						<Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
					</>
				) : (
					<span className="size-5" aria-hidden />
				)}
			</TooltipTrigger>
			<TooltipContent side="bottom">
				Toggle theme
				<span className="text-muted-foreground"> · </span>
				<kbd className="font-mono text-xs">d</kbd>
			</TooltipContent>
		</Tooltip>
	);
}
