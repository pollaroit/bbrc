import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const compact = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});

/** "1.2k views", or nothing until there is something to show. */
export function ViewCountLabel({
	count,
	className,
}: {
	count: number | undefined;
	className?: string;
}) {
	if (!count) return null;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 text-muted-foreground text-xs tabular-nums",
				className,
			)}
			title={`${count.toLocaleString("en-US")} ${count === 1 ? "view" : "views"}`}
		>
			<Eye className="size-3.5" aria-hidden />
			{compact.format(count)} {count === 1 ? "view" : "views"}
		</span>
	);
}
