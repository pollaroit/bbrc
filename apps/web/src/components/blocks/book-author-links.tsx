import { authorNameToSlug } from "@bbrc/shared";
import type { Route } from "next";
import Link from "next/link";
import { AuthorPhoto } from "@/components/blocks/author/author-photo";
import { cn } from "@/lib/utils";

type BookAuthorLinksProps = {
	/** Names copy of the book's authors (always present). */
	authors: string[];
	/** Author records when the data carries them; links then use the canonical slug. */
	refs?: { slug: string; name: string; photoUrl?: string | null }[];
	/** Show each author as a small portrait beside the name (book page header). */
	withPhotos?: boolean;
	className?: string;
};

export function BookAuthorLinks({
	authors,
	refs,
	withPhotos = false,
	className,
}: BookAuthorLinksProps) {
	const people: { slug: string; name: string; photoUrl?: string | null }[] =
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

	if (withPhotos) {
		return (
			<ul
				className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}
			>
				{people.map((person, index) => (
					<li key={`${person.slug}-${index}`}>
						<Link
							href={`/authors/${person.slug}` as Route}
							className="group/author inline-flex items-center gap-2.5 text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
						>
							<AuthorPhoto
								name={person.name}
								photoUrl={person.photoUrl}
								size="sm"
								className="size-8"
							/>
							<span className="underline-offset-4 group-hover/author:underline">
								{person.name}
							</span>
						</Link>
					</li>
				))}
			</ul>
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
