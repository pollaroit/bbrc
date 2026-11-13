import type { BookAboutAuthor } from "@bbrc/api/modules/book/book-about.service";
import { getBookCountryName } from "@bbrc/shared";
import type { Route } from "next";
import Link from "next/link";
import { AuthorPhoto } from "@/components/blocks/author/author-photo";
import { CountryFlagIcon } from "@/components/blocks/country-dropdown";
import { cn } from "@/lib/utils";

const focusRing =
	"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2";

function lifespan(author: BookAboutAuthor) {
	if (author.birthYear && author.deathYear) {
		return `${author.birthYear} to ${author.deathYear}`;
	}
	if (author.birthYear) return `Born ${author.birthYear}`;
	if (author.deathYear) return `Died ${author.deathYear}`;
	return null;
}

/** Who wrote it: a portrait, the years, the country, the start of the bio and a way to their other books. */
export function BookAboutAuthors({ authors }: { authors: BookAboutAuthor[] }) {
	if (authors.length === 0) return null;

	return (
		<section className="flex flex-col gap-3">
			<h2 className="font-semibold text-lg">
				{authors.length === 1 ? "The author" : "The authors"}
			</h2>
			<ul className="flex flex-col divide-y divide-border border border-border">
				{authors.map((author) => {
					const years = lifespan(author);
					const href = `/authors/${author.slug}` as Route;

					return (
						<li key={author.slug} className="flex gap-3 p-3">
							<Link
								href={href}
								className={cn("shrink-0", focusRing)}
								tabIndex={-1}
							>
								<AuthorPhoto
									name={author.name}
									photoUrl={author.photoUrl}
									size="md"
								/>
							</Link>
							<div className="flex min-w-0 flex-col gap-1.5">
								<div className="flex min-w-0 flex-col gap-0.5">
									<Link
										href={href}
										className={cn(
											"w-fit font-semibold underline-offset-4 hover:underline",
											focusRing,
										)}
									>
										{author.name}
									</Link>
									{years || author.nationalities.length > 0 ? (
										<p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground text-xs">
											{years ? (
												<span className="tabular-nums">{years}</span>
											) : null}
											{author.nationalities.slice(0, 2).map((code) => (
												<span
													key={code}
													className="inline-flex items-center gap-1.5"
												>
													<CountryFlagIcon alpha2={code} size="sm" />
													{getBookCountryName(code) ?? code}
												</span>
											))}
										</p>
									) : null}
								</div>
								{author.bio ? (
									<p className="text-muted-foreground text-sm leading-relaxed">
										{author.bio}
									</p>
								) : null}
								{author.bookCount > 1 ? (
									<Link
										href={href}
										className={cn(
											"w-fit text-sm underline-offset-4 hover:underline",
											focusRing,
										)}
									>
										{author.bookCount} books in the library
									</Link>
								) : null}
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
