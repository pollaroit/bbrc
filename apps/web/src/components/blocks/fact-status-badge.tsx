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
					"border-success/35 bg-success/10 font-normal text-success-ink",
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
