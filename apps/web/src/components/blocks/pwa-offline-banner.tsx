"use client";

import { useTranslations } from "next-intl";
import { useOnlineStatus } from "@/lib/pwa/use-online-status";

export function PwaOfflineBanner() {
	const t = useTranslations("shell.pwa");
	const online = useOnlineStatus();

	if (online) {
		return null;
	}

	return (
		<div
			className="border-border border-b bg-muted px-6 py-2 text-center text-muted-foreground text-xs"
			role="status"
		>
			{t("offline")}
		</div>
	);
}
