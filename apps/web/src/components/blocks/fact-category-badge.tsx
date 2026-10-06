import type { FactCategory } from "@bbrc/api/modules/admin/admin-fact.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { cn } from "@/lib/utils";

const categoryClassName: Partial<Record<FactCategory, string>> = {
	general: "border-border bg-muted/50 text-foreground",
	history:
		"border-amber-700/35 bg-amber-600/10 text-amber-950 dark:text-amber-200",
	science: "border-sky-700/35 bg-sky-600/10 text-sky-950 dark:text-sky-200",
	literature:
		"border-violet-700/35 bg-violet-600/10 text-violet-950 dark:text-violet-200",
	philosophy:
		"border-indigo-700/35 bg-indigo-600/10 text-indigo-950 dark:text-indigo-200",
	art: "border-rose-700/35 bg-rose-600/10 text-rose-950 dark:text-rose-200",
	music:
		"border-fuchsia-700/35 bg-fuchsia-600/10 text-fuchsia-950 dark:text-fuchsia-200",
	geography:
		"border-emerald-700/35 bg-emerald-600/10 text-emerald-950 dark:text-emerald-200",
	psychology:
		"border-teal-700/35 bg-teal-600/10 text-teal-950 dark:text-teal-200",
	technology:
		"border-slate-700/35 bg-slate-600/10 text-slate-950 dark:text-slate-200",
	language:
		"border-orange-700/35 bg-orange-600/10 text-orange-950 dark:text-orange-200",
	nature: "border-lime-700/35 bg-lime-600/10 text-lime-950 dark:text-lime-200",
	culture: "border-pink-700/35 bg-pink-600/10 text-pink-950 dark:text-pink-200",
	biography:
		"border-stone-700/35 bg-stone-600/10 text-stone-950 dark:text-stone-200",
	mathematics:
		"border-cyan-700/35 bg-cyan-600/10 text-cyan-950 dark:text-cyan-200",
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
