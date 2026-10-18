"use client";

import type { GetBookCatalogDiscoveryOutput } from "@bbrc/api/modules/book/book-catalog-discovery.schema";
import type { Route } from "next";
import Link from "next/link";
import { BookCard } from "@/components/blocks/book-card";

type DiscoverySection = GetBookCatalogDiscoveryOutput["similar"];

type BookDiscoverySectionProps = {
	section: DiscoverySection;
	seeAllHref?: Route;
};

export function BookDiscoverySection({
	section,
	seeAllHref,
}: BookDiscoverySectionProps) {
	if (section.items.length === 0) {
		return null;
	}

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 className="font-semibold text-lg">{section.title}</h2>
				{seeAllHref ? (
					<Link
						href={seeAllHref}
						className="text-primary text-sm underline-offset-4 hover:underline"
					>
						See all lists
					</Link>
				) : null}
			</div>
			<ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{section.items.map((book) => (
					<li key={book.slug}>
						<BookCard book={book} />
					</li>
				))}
			</ul>
		</section>
	);
}

type BookDiscoveryListsProps = {
	discovery: GetBookCatalogDiscoveryOutput;
};

export function BookDiscoveryLists({ discovery }: BookDiscoveryListsProps) {
	const sections = [
		discovery.similar,
		discovery.byAuthor,
		discovery.byCountry,
		discovery.byDecade,
		discovery.byPageSize,
	].filter((section): section is DiscoverySection => section != null);

	const visible = sections.filter((section) => section.items.length > 0);

	if (visible.length === 0) {
		return (
			<p className="text-muted-foreground text-sm">
				Not enough catalog overlap yet to suggest related books.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-10">
			{visible.map((section) => (
				<BookDiscoverySection key={section.title} section={section} />
			))}
		</div>
	);
}
