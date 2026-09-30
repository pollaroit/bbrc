"use client";

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
	const [label, setLabel] = useState(() => formatRelativeTime(date));

	useEffect(() => {
		setLabel(formatRelativeTime(date));
		const interval = window.setInterval(() => {
			setLabel(formatRelativeTime(date));
		}, 60_000);

		return () => window.clearInterval(interval);
	}, [date]);

	return (
		<time
			dateTime={iso}
			title={formatDateTime(date)}
			className={cn("tabular-nums", className)}
		>
			{label}
		</time>
	);
}
