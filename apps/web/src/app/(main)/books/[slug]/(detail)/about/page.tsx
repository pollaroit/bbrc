import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Metadata } from "next";
import { BookLiteraryOrigin } from "@/components/blocks/book-literary-origin";
import { BookSubjectGroup } from "@/components/blocks/book-subject-group";
import { loadBookBySlugForIsr } from "@/lib/isr-data";
import {
	buildBookTabMetadata,
	buildNotFoundMetadata,
} from "@/lib/seo/book-page-metadata";

export async function generateMetadata({
	params,
}: PageProps<"/books/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const book = await loadBookBySlugForIsr(slug);
		return buildBookTabMetadata(book, {
			title: "About",
			description: `Excerpt, subjects, and catalog notes for ${book.title}.`,
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
	const book = await loadBookBySlugForIsr(slug);

	const literaryCountries = book.countries ?? [];
	const subjectPeople = book.subjectPeople ?? [];
	const subjectTimes = book.subjectTimes ?? [];
	const subjects = book.subjects ?? [];
	const hasOpenLibrarySubjects =
		subjectPeople.length > 0 || subjectTimes.length > 0 || subjects.length > 0;

	return (
		<div className="flex max-w-3xl flex-col gap-8">
			{book.excerpt ? (
				<section className="flex flex-col gap-3">
					<h2 className="font-semibold text-lg">Excerpt</h2>
					<p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
						{book.excerpt}
					</p>
				</section>
			) : (
				<p className="text-muted-foreground text-sm">
					No excerpt is stored for this title yet.
				</p>
			)}

			<BookLiteraryOrigin countries={literaryCountries} />

			{hasOpenLibrarySubjects ? (
				<section className="flex flex-col gap-4">
					<h2 className="font-semibold text-lg">Topics from Open Library</h2>
					<div className="grid gap-4 sm:grid-cols-2">
						<BookSubjectGroup label="Subjects" items={subjects} />
						<BookSubjectGroup label="People" items={subjectPeople} />
						<BookSubjectGroup label="Times & places" items={subjectTimes} />
					</div>
				</section>
			) : null}

			<section className="grid gap-3 sm:grid-cols-2">
				<Card size="sm">
					<CardHeader>
						<CardTitle>Added to BBRC</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="font-medium tabular-nums">
							{new Intl.DateTimeFormat(undefined, {
								dateStyle: "medium",
							}).format(book.createdAt)}
						</p>
					</CardContent>
				</Card>
				<Card size="sm">
					<CardHeader>
						<CardTitle>Catalog slug</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="font-mono text-sm">{book.slug}</p>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
