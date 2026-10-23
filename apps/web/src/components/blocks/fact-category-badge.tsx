import type { FactCategory } from "@bbrc/api/modules/admin/admin-fact.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { cn } from "@/lib/utils";

const categoryClassName: Partial<Record<FactCategory, string>> = {
	general: "border-border bg-muted/50 text-foreground",
	history: "border-warning/35 bg-warning/10 text-warning-ink",
	science: "border-info/35 bg-info/10 text-info-ink",
	literature: "border-violet/35 bg-violet/10 text-violet-ink",
	philosophy: "border-info/35 bg-info/10 text-info-ink",
	art: "border-destructive/35 bg-destructive/10 text-destructive-ink",
	music: "border-violet/35 bg-violet/10 text-violet-ink",
	geography: "border-success/35 bg-success/10 text-success-ink",
	psychology: "border-success/35 bg-success/10 text-success-ink",
	technology: "border-border bg-muted text-foreground",
	language: "border-warning/35 bg-warning/10 text-warning-ink",
	nature: "border-success/35 bg-success/10 text-success-ink",
	culture: "border-pink/35 bg-pink/10 text-pink-ink",
	biography: "border-border bg-muted text-foreground",
	mathematics: "border-info/35 bg-info/10 text-info-ink",
};

function formatCategoryLabel(category: FactCategory): string {
	return category.charAt(0).toUpperCase() + category.slice(1);
}

export function FactCategoryBadge({
	category,
	className,
}: {
	category: FactCategory;
	className?: string;
}) {
	return (
		<Badge
			variant="outline"
			className={cn(
				"font-normal",
				categoryClassName[category] ??
					"border-border bg-muted/50 text-foreground",
				className,
			)}
		>
			{formatCategoryLabel(category)}
		</Badge>
	);
}
