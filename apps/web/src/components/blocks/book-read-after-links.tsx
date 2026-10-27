import type { TGetBookBySlugOutputSchema } from "@bbrc/api/modules/book/book.schema";
import type { Route } from "next";
import { Link } from "@/i18n/navigation";

type BookReadAfterLinksProps = {
	readAfterBooks: TGetBookBySlugOutputSchema["readAfterBooks"];
};

export function BookReadAfterLinks({
	readAfterBooks,
}: BookReadAfterLinksProps) {
	if (readAfterBooks.length === 0) {
		return null;
	}

	return (
		<p className="text-muted-foreground text-sm leading-relaxed">
			Must be read after{" "}
			{readAfterBooks.map((book, index) => (
				<span key={book.slug}>
					{index > 0 ? ", " : null}
					<Link
						href={`/books/${book.slug}` as Route}
						className="text-foreground underline-offset-4 hover:underline"
					>
						{book.title}
					</Link>
				</span>
			))}
			.
		</p>
	);
}
