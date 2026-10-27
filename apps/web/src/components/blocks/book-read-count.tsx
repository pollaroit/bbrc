import { BookCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type BookReadCountProps = {
	count: number;
	className?: string;
};

export function BookReadCount({ count, className }: BookReadCountProps) {
	const t = useTranslations("books");
	return (
		<span
			className={cn(
				"inline-flex min-w-0 max-w-full items-center gap-0.5 text-muted-foreground tabular-nums",
				className,
			)}
			title={t("readCount.title", { count })}
		>
			<BookCheck className="size-3.5 shrink-0" aria-hidden />
			<span className="truncate">{count}</span>
		</span>
	);
}
