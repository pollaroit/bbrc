"use client";

import type { SearchWorkEditionsOutput } from "@bbrc/api/modules/read/read.schema";
import { openLibraryEditionKey, openLibraryWorkPageUrl } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@bbrc/ui/components/empty";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import {
	CompareBar,
	EditionSelectBox,
	type EditionSelection,
	useEditionSelection,
} from "@/components/blocks/book-editions/edition-select";
import { MemberEditionsSection } from "@/components/blocks/book-editions/member-editions-section";
import { Link } from "@/i18n/navigation";
import { bookCoverFrameClassName, bookCoverUrl } from "@/lib/book-cover";
import { editionPath } from "@/lib/edition/format";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { useBookEditionsListingSearchParams } from "@/lib/listing/book-editions-listing";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const editionsGridClassName =
	"grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

type BookEditionsPanelProps = {
	bookSlug: string;
	bookTitle: string;
	workOlid: string | null;
};

function EditionMetaRow({
	label,
	value,
}: {
	label: string;
	value: string | null | undefined;
}) {
	if (!value?.trim()) {
		return null;
	}

	return (
		<p className="text-sm">
			<span className="text-muted-foreground">{label}: </span>
			<span>{value}</span>
		</p>
	);
}

function BookEditionsGrid({
	data,
	bookSlug,
	selection,
}: {
	data: SearchWorkEditionsOutput;
	bookSlug: string;
	selection: EditionSelection;
}) {
	if (data.items.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyTitle>No editions match</EmptyTitle>
					<EmptyDescription>
						Try clearing the search or choosing another language filter.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		);
	}

	return (
		<ul className={editionsGridClassName}>
			{data.items.map((edition) => {
				const coverSrc = bookCoverUrl(edition.coverId, "M");
				const key = openLibraryEditionKey(edition.editionId);
				const href = editionPath(bookSlug, key) as Route;

				return (
					<li
						key={edition.editionId}
						className="flex h-full flex-col border border-border bg-card"
					>
						<div className="flex flex-col gap-4 p-4">
							<Link
								href={href}
								aria-label={`Open the edition page: ${edition.title}`}
								className={cn(
									"relative mx-auto block aspect-2/3 w-full max-w-[9rem]",
									bookCoverFrameClassName,
								)}
							>
								{coverSrc ? (
									<Image
										src={coverSrc}
										alt=""
										fill
										className="object-cover"
										sizes="(max-width: 640px) 40vw, 144px"
									/>
								) : (
									<div className="flex size-full items-center justify-center px-2 text-center text-muted-foreground text-xs">
										No cover
									</div>
								)}
							</Link>

							<div className="flex min-w-0 flex-col gap-2">
								<h3 className="font-medium text-sm leading-snug">
									<Link
										href={href}
										className="underline-offset-4 hover:underline"
									>
										{edition.title}
									</Link>
								</h3>
								<EditionMetaRow
									label="Published"
									value={edition.publishDate ?? undefined}
								/>
								<EditionMetaRow
									label="Publisher"
									value={
										edition.publishers.length > 0
											? edition.publishers.join(", ")
											: undefined
									}
								/>
								<EditionMetaRow
									label="Language"
									value={
										edition.languages.length > 0
											? edition.languages.join(", ")
											: undefined
									}
								/>
								<EditionMetaRow
									label="Format"
									value={
										edition.physicalFormat
											? [
													edition.physicalFormat,
													edition.pages ? `${edition.pages} pp.` : null,
												]
													.filter(Boolean)
													.join(" · ")
											: edition.pages
												? `${edition.pages} pp.`
												: undefined
									}
								/>
								{edition.publishPlaces.length > 0 ? (
									<EditionMetaRow
										label="Place"
										value={edition.publishPlaces.join(", ")}
									/>
								) : null}
								{edition.isbn13 ? (
									<p className="font-mono text-muted-foreground text-xs">
										ISBN-13 {edition.isbn13}
									</p>
								) : null}
							</div>
						</div>

						<div className="mt-auto flex flex-wrap items-center gap-2 border-border border-t p-3">
							<Button
								size="sm"
								nativeButton={false}
								render={<Link href={href} />}
							>
								View edition
							</Button>
							<EditionSelectBox
								editionKey={key}
								selection={selection}
								className="ms-auto"
							/>
							<Button
								variant="outline"
								size="sm"
								nativeButton={false}
								render={
									<a
										href={edition.openLibraryUrl}
										target="_blank"
										rel="noreferrer noopener"
									/>
								}
							>
								Open Library
								<ExternalLink className="size-3.5" aria-hidden />
							</Button>
							{edition.isbnUrl ? (
								<Button
									variant="ghost"
									size="sm"
									nativeButton={false}
									render={
										<a
											href={edition.isbnUrl}
											target="_blank"
											rel="noreferrer noopener"
										/>
									}
								>
									ISBN record
									<ExternalLink className="size-3.5" aria-hidden />
								</Button>
							) : null}
						</div>
					</li>
				);
			})}
		</ul>
	);
}

export function BookEditionsPanel({
	bookSlug,
	bookTitle,
	workOlid,
}: BookEditionsPanelProps) {
	const f = useFormatters();
	const [params, setParams] = useBookEditionsListingSearchParams();
	const selection = useEditionSelection();

	const editionsQuery = useQuery(
		orpc.read.searchEditions.queryOptions({
			input: {
				bookSlug,
				query: params.search?.trim() || undefined,
				language: params.language === "any" ? undefined : params.language,
				page: params.page,
				limit: 12,
			},
			enabled: workOlid != null,
		}),
	);

	const workPageUrl = workOlid ? openLibraryWorkPageUrl(workOlid) : null;

	if (!workOlid) {
		return (
			<div className="flex flex-col gap-8">
				<MemberEditionsSection
					bookSlug={bookSlug}
					bookTitle={bookTitle}
					selection={selection}
				/>
				<Empty>
					<EmptyHeader>
						<EmptyTitle>No Open Library work linked</EmptyTitle>
						<EmptyDescription>
							This catalog entry does not have an Open Library work ID, so Open
							Library edition data cannot be loaded.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
				<CompareBar bookSlug={bookSlug} selection={selection} />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<MemberEditionsSection
				bookSlug={bookSlug}
				bookTitle={bookTitle}
				selection={selection}
			/>
			<h2 className="border-border border-t pt-6 font-semibold text-lg tracking-tight">
				Open Library editions
			</h2>
			<p className="-mt-4 text-muted-foreground text-sm leading-relaxed">
				Editions are loaded from Open Library for this work. Covers, publishers,
				and dates come from community catalog data and may vary in completeness.{" "}
				{workPageUrl ? (
					<a
						href={workPageUrl}
						target="_blank"
						rel="noreferrer noopener"
						className="text-foreground underline underline-offset-4"
					>
						View the work on Open Library
					</a>
				) : null}
			</p>

			{editionsQuery.isPending ? (
				<div className={cn(editionsGridClassName)} aria-hidden>
					{Array.from({ length: 8 }, (_, index) => (
						<Skeleton key={index} className="h-80 w-full" />
					))}
				</div>
			) : editionsQuery.isError ? (
				<p className="text-muted-foreground text-sm">
					Could not load editions from Open Library. Refresh the page to try
					again.
				</p>
			) : (
				<>
					<p className="text-muted-foreground text-sm tabular-nums">
						{editionsQuery.data.total === 0
							? "No editions"
							: `${f.number(editionsQuery.data.total)} edition${
									editionsQuery.data.total === 1 ? "" : "s"
								}`}
						{editionsQuery.data.totalPages > 1
							? ` · Page ${editionsQuery.data.page} of ${editionsQuery.data.totalPages}`
							: null}
					</p>
					<BookEditionsGrid
						data={editionsQuery.data}
						bookSlug={bookSlug}
						selection={selection}
					/>
					{editionsQuery.data.totalPages > 1 ? (
						<div className="flex items-center justify-between gap-2 border border-border px-4 py-3">
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={params.page <= 1}
								onClick={() => void setParams({ page: params.page - 1 })}
							>
								Previous
							</Button>
							<span className="text-muted-foreground text-sm tabular-nums">
								Page {params.page} of {editionsQuery.data.totalPages}
							</span>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={!editionsQuery.data.hasNextPage}
								onClick={() => void setParams({ page: params.page + 1 })}
							>
								Next
							</Button>
						</div>
					) : null}
				</>
			)}
			<CompareBar bookSlug={bookSlug} selection={selection} />
		</div>
	);
}
