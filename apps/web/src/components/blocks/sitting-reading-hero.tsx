"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import type { Route } from "next";
import Link from "next/link";
import { SittingParticipationProgress } from "@/components/blocks/sitting-participation-progress";
import { SittingReadingBook } from "@/components/blocks/sitting-reading-book";

type SittingReadingHeroProps = {
	sitting: GetSittingBySlugOutput;
};

export function SittingReadingHero({ sitting }: SittingReadingHeroProps) {
	if (!sitting.selectedBook) {
		return null;
	}

	const book = sitting.selectedBook;

	return (
		<SittingReadingBook
			book={book}
			variant="hero"
			footer={
				<>
					<SittingParticipationProgress
						sittingSlug={sitting.slug}
						sittingStatus={sitting.status}
						participants={sitting.participants}
					/>
					<p className="text-muted-foreground text-sm">
						Share notes or guides:{" "}
						<Link
							href={`/books/${book.slug}/edit/docs/new` as Route}
							className="font-medium text-foreground underline-offset-4 hover:underline"
						>
							Add a PDF document
						</Link>
						.
					</p>
				</>
			}
		/>
	);
}
