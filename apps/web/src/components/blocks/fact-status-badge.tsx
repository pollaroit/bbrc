import { Badge } from "@bbrc/ui/components/badge";
import { cn } from "@/lib/utils";

export function FactStatusBadge({
	publishedAt,
	className,
}: {
	publishedAt: Date | null;
	className?: string;
}) {
	if (publishedAt) {
		return (
			<Badge
				variant="outline"
				className={cn(
					"border-emerald-700/35 bg-emerald-600/10 font-normal text-emerald-950 dark:text-emerald-200",
					className,
				)}
			>
				Live
			</Badge>
		);
	}

	return (
		<Badge
			variant="outline"
			className={cn("font-normal text-muted-foreground", className)}
		>
			Draft
		</Badge>
	);
}
