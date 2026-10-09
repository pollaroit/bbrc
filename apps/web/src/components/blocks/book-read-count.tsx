import { BookCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type BookReadCountProps = {
	count: number;
	className?: string;
};

export function BookReadCount({ count, className }: BookReadCountProps) {
	return (
		<span
			className={cn(
				"inline-flex min-w-0 max-w-full items-center gap-0.5 text-muted-foreground tabular-nums",
				className,
			)}
			title={`${count} member${count === 1 ? "" : "s"} marked read`}
		>
			<BookCheck className="size-3.5 shrink-0" aria-hidden />
			<span className="truncate">{count}</span>
		</span>
	);
}
