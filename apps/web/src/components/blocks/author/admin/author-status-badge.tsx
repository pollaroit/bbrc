import { authorStatusLabels } from "@/lib/listing/authors-listing";
import { cn } from "@/lib/utils";

const statusClassName = {
	verified: "bg-success/10 text-success-ink",
	auto: "bg-info/10 text-info-ink",
	needs_review: "bg-warning/10 text-warning-ink",
} as const;

export function AuthorStatusBadge({
	status,
	className,
}: {
	status: keyof typeof authorStatusLabels;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex w-fit items-center px-1.5 py-0.5 font-medium text-2xs",
				statusClassName[status],
				className,
			)}
		>
			{authorStatusLabels[status]}
		</span>
	);
}
