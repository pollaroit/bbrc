import type { ReactNode } from "react";

type LeaderboardPageHeaderProps = {
	title: string;
	description: string;
	stats?: ReactNode;
	actions?: ReactNode;
};

export function LeaderboardPageHeader({
	title,
	description,
	stats,
	actions,
}: LeaderboardPageHeaderProps) {
	return (
		<header className="flex flex-col border border-border bg-card">
			<div className="flex flex-col gap-4 p-4 sm:p-6">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="flex max-w-prose flex-col gap-2">
						<h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
							{title}
						</h1>
						<p className="text-muted-foreground text-sm leading-relaxed">
							{description}
						</p>
					</div>
					{actions ? (
						<div className="flex shrink-0 items-center gap-2">{actions}</div>
					) : null}
				</div>
				{stats ? (
					<dl className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
						{stats}
					</dl>
				) : null}
			</div>
		</header>
	);
}

export function LeaderboardStat({
	label,
	value,
}: {
	label: string;
	value: ReactNode;
}) {
	return (
		<div className="bg-card px-3 py-2.5">
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="mt-0.5 font-medium text-sm tabular-nums leading-snug">
				{value}
			</dd>
		</div>
	);
}
