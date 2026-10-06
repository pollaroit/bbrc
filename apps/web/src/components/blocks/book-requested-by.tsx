import type { BookRequestedBy } from "@bbrc/api/modules/book/book.schema";
import { cn } from "@bbrc/ui/lib/utils";
import type { Route } from "next";
import Link from "next/link";

type BookRequestedByProps = {
	requestedBy: BookRequestedBy;
	className?: string;
};

export function BookRequestedByLine({
	requestedBy,
	className,
}: BookRequestedByProps) {
	const displayName = requestedBy.name?.trim() || requestedBy.username;

	return (
		<p className={cn("text-muted-foreground text-xs", className)}>
			Requested by{" "}
			<Link
				href={`/users/${requestedBy.username}` as Route}
				className="text-foreground underline-offset-2 hover:underline"
			>
				{displayName}
			</Link>
		</p>
	);
}
