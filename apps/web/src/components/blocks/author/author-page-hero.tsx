import type { AuthorGetOutput } from "@bbrc/api/modules/author/author.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { CountryFlagIcon } from "@/components/blocks/country-dropdown";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { AuthorPageAdminBar } from "./author-page-admin-bar";
import { AuthorPagePortrait } from "./author-page-portrait";
import { FollowAuthorButton } from "./follow-author-button";

const compact = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});

const GENDER_LABEL = {
	female: "Woman",
	male: "Man",
	non_binary: "Non-binary",
	other: "Other",
} as const;

function Figure({ value, label }: { value: string; label: string }) {
	return (
		<div className="flex min-w-0 flex-col gap-0.5 px-3 py-2 first:pl-0 sm:px-4 sm:first:pl-0">
			<dd className="font-semibold text-base tabular-nums leading-tight sm:text-lg">
				{value}
			</dd>
			<dt className="truncate text-2xs text-muted-foreground">{label}</dt>
		</div>
	);
}

/**
 * The top of every author page. It is built from the cached, signed-out copy of the author, so
 * anything that depends on the viewer (follow state, admin tools) is a small client island.
 */
export function AuthorPageHero({ author }: { author: AuthorGetOutput }) {
	const { profile, numbers } = author;
	const bornAt = profile.birth.place;
	const diedAt = profile.death.place;
	const places =
		bornAt && diedAt && bornAt !== diedAt
			? `${bornAt} to ${diedAt}`
			: (bornAt ?? diedAt);

	return (
		<header className="flex gap-4 sm:gap-6">
			<AuthorPagePortrait
				name={profile.name}
				photoUrl={profile.photo?.url ?? null}
			/>

			<div className="flex min-w-0 flex-1 flex-col gap-3">
				<div className="flex flex-col gap-1">
					<p className="text-muted-foreground text-sm">Author</p>
					<h1 className="text-balance font-bold text-2xl tracking-tight sm:text-4xl">
						{profile.name}
					</h1>
					{profile.lifespan || profile.age.text ? (
						<p className="text-muted-foreground text-sm tabular-nums">
							{[profile.lifespan, profile.age.text].filter(Boolean).join(" · ")}
							{places ? <span> · {places}</span> : null}
						</p>
					) : null}
				</div>

				{profile.nationalities.length > 0 || profile.gender ? (
					<ul className="flex flex-wrap gap-1.5" aria-label="Nationality">
						{profile.nationalities.map((country) => (
							<li key={country.code}>
								<Badge variant="outline" className="gap-1.5">
									<CountryFlagIcon alpha2={country.code} size="sm" />
									{country.name}
								</Badge>
							</li>
						))}
						{profile.gender ? (
							<li>
								<Badge variant="outline">{GENDER_LABEL[profile.gender]}</Badge>
							</li>
						) : null}
					</ul>
				) : null}

				<dl className="flex flex-wrap divide-x divide-border border-border border-y">
					<Figure
						value={compact.format(numbers.bookCount)}
						label={numbers.bookCount === 1 ? "book" : "books"}
					/>
					<Figure
						value={compact.format(numbers.readerCount)}
						label={numbers.readerCount === 1 ? "reader" : "readers"}
					/>
					<Figure
						value={compact.format(numbers.readCount)}
						label={numbers.readCount === 1 ? "read" : "reads"}
					/>
					<Figure
						value={
							numbers.averageRating != null
								? numbers.averageRating.toFixed(1)
								: "–"
						}
						label={
							numbers.reviewCount > 0
								? `from ${compact.format(numbers.reviewCount)} ${numbers.reviewCount === 1 ? "review" : "reviews"}`
								: "no reviews yet"
						}
					/>
				</dl>

				<div className="flex flex-wrap items-center gap-2">
					<FollowAuthorButton
						slug={profile.slug}
						initial={{ following: false, followerCount: numbers.followerCount }}
					/>
					<ResourceShareMenu
						path={`/authors/${profile.slug}`}
						shareText={profile.name}
						label="Share author"
						shareInPost={{ kind: "author", slug: profile.slug }}
						size="md"
						iconOnly
					/>
					<AuthorPageAdminBar slug={profile.slug} />
				</div>
			</div>
		</header>
	);
}
