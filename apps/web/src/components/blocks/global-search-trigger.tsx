"use client";

import { Button } from "@bbrc/ui/components/button";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useGlobalSearch } from "@/components/blocks/global-search-provider";
import { headerToolbarIconButtonClass } from "@/lib/header-toolbar";
import { cn } from "@/lib/utils";

type GlobalSearchTriggerProps = {
	variant: "desktop" | "mobile";
	className?: string;
};

export function GlobalSearchTrigger({
	variant,
	className,
}: GlobalSearchTriggerProps) {
	const t = useTranslations("shell.search");
	const { openSearch } = useGlobalSearch();

	const buttonClass = cn(headerToolbarIconButtonClass, className);

	if (variant === "mobile") {
		return (
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className={buttonClass}
				onClick={openSearch}
				aria-label={t("triggerMobile")}
			>
				<Search aria-hidden />
			</Button>
		);
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className={buttonClass}
			onClick={openSearch}
			aria-label={t("triggerDesktop")}
		>
			<Search aria-hidden />
		</Button>
	);
}

export function GlobalSearchMobileTrigger({
	className,
}: {
	className?: string;
}) {
	return (
		<GlobalSearchTrigger
			variant="mobile"
			className={cn("md:hidden", className)}
		/>
	);
}
