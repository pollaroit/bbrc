import { authorNameToSlug } from "@bbrc/shared";
import type { Route } from "next";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type BookAuthorLinksProps = {
	/** Names copy of the book's authors (always present). */
	authors: string[];
	/** Author records when the data carries them; links then use the canonical slug. */
	refs?: { slug: string; name: string }[];
	className?: string;
};

export function BookAuthorLinks({
	authors,
	refs,
	className,
}: BookAuthorLinksProps) {
	const people =
		refs && refs.length > 0
			? refs
			: authors.map((name) => ({ name, slug: authorNameToSlug(name) }));

	if (people.length === 0) {
		return (
			<span className={cn("text-muted-foreground", className)}>
				Unknown author
			</span>
		);
	}

	return (
		<span className={cn("text-muted-foreground", className)}>
			{people.map(({ name, slug }, index) => {
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
