import { Eye } from "lucide-react";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";

const compact = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});

/** An eye and the count ("1.2k"), or nothing until there is something to show. */
export function ViewCountLabel({
	count,
	className,
}: {
	count: number | undefined;
	className?: string;
}) {
	const f = useFormatters();
	if (!count) return null;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 text-muted-foreground text-xs tabular-nums",
				className,
			)}
			title={`${f.number(count)} ${count === 1 ? "view" : "views"}`}
		>
			<Eye className="size-3.5" aria-hidden />
			{compact.format(count)}
			<span className="sr-only">{count === 1 ? "view" : "views"}</span>
		</span>
	);
}
