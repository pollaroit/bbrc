"use client";

import { Button } from "@bbrc/ui/components/button";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

/** Keeps a render error inside the page area instead of blanking the whole app. */
export default function MainError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const t = useTranslations("shell.error");
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="flex flex-col items-start gap-3 border border-border border-dashed p-6">
			<div className="flex flex-col gap-1">
				<p className="font-medium text-sm">{t("title")}</p>
				<p className="max-w-prose text-muted-foreground text-sm">
					{t("description")}
				</p>
			</div>
			<Button type="button" size="sm" onClick={reset}>
				{t("retry")}
			</Button>
		</div>
	);
}
