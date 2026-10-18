import { authorNameToSlug } from "@bbrc/shared";
import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BookAuthorLinksProps = {
	authors: string[];
	className?: string;
};

export function BookAuthorLinks({ authors, className }: BookAuthorLinksProps) {
	if (authors.length === 0) {
		return (
			<span className={cn("text-muted-foreground", className)}>
				Unknown author
			</span>
		);
	}

	return (
		<span className={cn("text-muted-foreground", className)}>
			{authors.map((name, index) => {
				const slug = authorNameToSlug(name);
				const href = `/authors/${slug}` as Route;

				return (
					<span key={`${slug}-${index}`}>
						{index > 0 ? ", " : null}
						<Link
							href={href}
							className="pointer-events-auto relative z-2 text-foreground underline-offset-4 hover:underline"
						>
							{name}
						</Link>
					</span>
				);
			})}
		</span>
	);
}
