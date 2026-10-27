import type { ViewInsights } from "@bbrc/api/modules/view/view.schema";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { formatCount } from "./insight-format";
import { InsightPanel } from "./insight-panel";

type Rows = ViewInsights["sources"];

/** Horizontal bars, longest first, with the share of all views beside each. */
export function BarList({ rows }: { rows: Rows }) {
	const f = useFormatters();
	const total = rows.reduce((sum, row) => sum + row.views, 0);
	const max = Math.max(1, ...rows.map((row) => row.views));
	if (rows.length === 0) {
		return <p className="text-muted-foreground text-sm">Nothing yet.</p>;
	}
	return (
		<ul className="flex flex-col gap-2.5">
			{rows.map((row) => {
				const share = total > 0 ? Math.round((row.views / total) * 100) : 0;
				return (
					<li key={row.key} className="flex flex-col gap-1">
						<div className="flex items-baseline justify-between gap-3 text-sm">
							<span className="min-w-0 truncate">{row.label}</span>
							<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
								{formatCount(f, row.views)} · {share}%
							</span>
						</div>
						<span className="block h-1.5 w-full bg-muted" aria-hidden>
							<span
								className="block h-full bg-primary"
								style={{ width: `${(row.views / max) * 100}%` }}
							/>
						</span>
					</li>
				);
			})}
		</ul>
	);
}

export function InsightSources({ rows }: { rows: Rows }) {
	return (
		<InsightPanel
			title="Where views come from"
			description="The page people were on before they got here."
		>
			<BarList rows={rows} />
		</InsightPanel>
	);
}

export function InsightCountries({ rows }: { rows: Rows }) {
	return (
		<InsightPanel
			title="Countries"
			description="From the visitor's connection."
		>
			<BarList rows={rows} />
		</InsightPanel>
	);
}

export function InsightReferrers({ rows }: { rows: Rows }) {
	return (
		<InsightPanel
			title="Websites that sent people here"
			description="Other sites people came from, over the last 90 days. Host names only."
		>
			<BarList rows={rows} />
		</InsightPanel>
	);
}

/** Devices, browsers and systems side by side. */
export function InsightTechnology({ insights }: { insights: ViewInsights }) {
	return (
		<div className="grid gap-4 md:grid-cols-2">
			<InsightPanel title="Devices">
				<BarList rows={insights.devices} />
			</InsightPanel>
			<InsightPanel title="Browsers">
				<BarList rows={insights.browsers} />
			</InsightPanel>
			<InsightPanel title="Systems">
				<BarList rows={insights.systems} />
			</InsightPanel>
		</div>
	);
}
