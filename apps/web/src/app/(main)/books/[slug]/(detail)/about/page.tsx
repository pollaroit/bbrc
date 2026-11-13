import type { Metadata } from "next";
import { BookAboutAuthors } from "@/components/blocks/book-about-authors";
import { BookAboutFacts } from "@/components/blocks/book-about-facts";
import { BookExcerpt } from "@/components/blocks/book-excerpt";
import { BookTopics } from "@/components/blocks/book-topics";
import { loadBookAboutForIsr, loadBookBySlugForIsr } from "@/lib/isr-data";
import {
	buildBookTabMetadata,
	buildNotFoundMetadata,
} from "@/lib/seo/book-page-metadata";

/** On-demand ISR: only the book overview is warmed at build. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/books/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const book = await loadBookBySlugForIsr(slug);
		return buildBookTabMetadata(book, {
			title: "About",
			description: `Excerpt, author, subjects and catalogue facts for ${book.title}.`,
			segment: "about",
		});
	} catch {
		return buildNotFoundMetadata("Book");
	}
}

export default async function BookAboutPage({
	params,
}: PageProps<"/books/[slug]">) {
	const { slug } = await params;
	const [book, about] = await Promise.all([
		loadBookBySlugForIsr(slug),
		loadBookAboutForIsr(slug),
	]);

	const subjects = book.subjects ?? [];
	const people = book.subjectPeople ?? [];
	const times = book.subjectTimes ?? [];
	const hasTopics = subjects.length + people.length + times.length > 0;

	return (
		<div className="flex flex-col gap-8">
			<BookAboutFacts book={book} about={about} />

			<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-10">
				<div className="flex min-w-0 flex-col gap-8">
					<section className="flex flex-col gap-3">
						<h2 className="font-semibold text-lg">Excerpt</h2>
						{book.excerpt ? (
							<BookExcerpt excerpt={book.excerpt} />
						) : (
							<p className="text-muted-foreground text-sm">
								No excerpt has been added for this book yet.
							</p>
						)}
					</section>

					{hasTopics ? (
						<section className="flex flex-col gap-3">
							<h2 className="font-semibold text-lg">Topics</h2>
							<BookTopics subjects={subjects} people={people} times={times} />
						</section>
					) : null}
				</div>

				<BookAboutAuthors authors={about.authors} />
			</div>
		</div>
	);
}
