import type { EditionPage } from "@bbrc/api/modules/edition/edition.schema";
import { ArrowRight, GitCompareArrows } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { CompareEditionsButton } from "@/components/blocks/edition-page/compare-editions-dialog";
import { EditionSection } from "@/components/blocks/edition-page/section";
import { Link } from "@/i18n/navigation";
import { bookCoverFrameClassName } from "@/lib/book-cover";
import { coverSrc, editionPath, summaryLine } from "@/lib/edition/format";
import { cn } from "@/lib/utils";

/**
 * How this edition differs from the one the club reads most, in plain
 * sentences, with a button for the full side-by-side.
 */
export function EditionCompare({
	page,
}: {
	page: Pick<EditionPage, "book" | "edition" | "compare" | "others">;
}) {
	const { compare, book, edition, others } = page;
	const baseline = compare.baseline;
	const thumb = coverSrc(baseline?.cover, "S");

	return (
		<EditionSection
			id="edition-compare"
			title="Compared with the club's edition"
			description={
				baseline
					? "The edition most members read, and what is different here."
					: "Nobody has settled on an edition yet, or this is the one."
			}
			aside={
				others.length > 0 ? (
					<CompareEditionsButton
						bookSlug={book.slug}
						currentKey={edition.key}
						candidates={others}
						currentLabel={edition.title ?? book.title}
					/>
				) : null
			}
		>
			{baseline ? (
				<div className="grid gap-4 border border-border p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
					<Link
						href={editionPath(book.slug, baseline.key) as Route}
						className="flex items-start gap-3 sm:flex-col"
					>
						<span
							className={cn(
								"relative block aspect-2/3 w-14 shrink-0 sm:w-20",
								bookCoverFrameClassName,
							)}
						>
							{thumb ? (
								<Image
									src={thumb}
									alt=""
									fill
									className="object-cover"
									sizes="80px"
								/>
							) : null}
						</span>
					</Link>
					<div className="flex min-w-0 flex-col gap-3">
						<div className="flex flex-col gap-0.5">
							<Link
								href={editionPath(book.slug, baseline.key) as Route}
								className="inline-flex items-center gap-1.5 font-medium text-sm underline-offset-4 hover:underline"
							>
								{baseline.label}
								<ArrowRight className="size-3.5" aria-hidden />
							</Link>
							<p className="text-muted-foreground text-xs">
								{summaryLine(baseline)} · {baseline.readers}{" "}
								{baseline.readers === 1 ? "reader" : "readers"}
							</p>
						</div>
						{compare.differences.length > 0 ? (
							<ul className="flex flex-col gap-1.5 text-sm">
								{compare.differences.map((line) => (
									<li key={line} className="flex gap-2">
										<GitCompareArrows
											className="mt-0.5 size-4 shrink-0 text-muted-foreground"
											aria-hidden
										/>
										{line}
									</li>
								))}
							</ul>
						) : (
							<p className="text-muted-foreground text-sm">
								Nothing stands out: it matches the club's edition on the details
								we have.
							</p>
						)}
					</div>
				</div>
			) : null}
		</EditionSection>
	);
}
