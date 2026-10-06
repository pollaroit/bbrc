import type { FactCategory } from "@bbrc/api/modules/admin/admin-fact.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { cn } from "@/lib/utils";

const categoryClassName: Record<FactCategory, string> = {
	general: "border-border bg-muted/50 text-foreground",
	history:
		"border-amber-700/35 bg-amber-600/10 text-amber-950 dark:text-amber-200",
	science: "border-sky-700/35 bg-sky-600/10 text-sky-950 dark:text-sky-200",
	literature:
		"border-violet-700/35 bg-violet-600/10 text-violet-950 dark:text-violet-200",
	philosophy:
		"border-indigo-700/35 bg-indigo-600/10 text-indigo-950 dark:text-indigo-200",
};

const categoryLabel: Record<FactCategory, string> = {
	general: "General",
	history: "History",
	science: "Science",
	literature: "Literature",
	philosophy: "Philosophy",
};

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
			className={cn("font-normal", categoryClassName[category], className)}
		>
			{categoryLabel[category]}
		</Badge>
	);
}
