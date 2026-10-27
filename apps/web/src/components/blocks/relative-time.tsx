"use client";

import { toLocale } from "@bbrc/i18n";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format-datetime";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { cn } from "@/lib/utils";

type RelativeTimeProps = {
	date: Date | string;
	className?: string;
};

export function RelativeTime({ date, className }: RelativeTimeProps) {
	const iso =
		typeof date === "string"
			? new Date(date).toISOString()
			: date.toISOString();
	const locale = toLocale(useLocale());
	const [label, setLabel] = useState(() =>
		formatRelativeTime(date, new Date(), locale),
	);

	useEffect(() => {
		setLabel(formatRelativeTime(date, new Date(), locale));
		const interval = window.setInterval(() => {
			setLabel(formatRelativeTime(date, new Date(), locale));
		}, 60_000);

		return () => window.clearInterval(interval);
	}, [date, locale]);

	return (
		<time
			dateTime={iso}
			title={formatDateTime(date, locale)}
			className={cn("tabular-nums", className)}
		>
			{label}
		</time>
	);
}
