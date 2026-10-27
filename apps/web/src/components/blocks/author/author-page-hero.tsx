import type { AuthorGetOutput } from "@bbrc/api/modules/author/author.schema";
import { Badge } from "@bbrc/ui/components/badge";
import type { Route } from "next";
import { CountryFlagIcon } from "@/components/blocks/country-dropdown";
import { ResourceShareMenu } from "@/components/blocks/resource-share-menu";
import { Link } from "@/i18n/navigation";
import {
	AUTHOR_TABS,
	type AuthorTabId,
	authorTabHref,
} from "@/lib/author-tabs";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { AuthorPageAdminBar } from "./author-page-admin-bar";
import { AuthorPhoto } from "./author-photo";
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

function Figure({
	value,
	label,
	href,
}: {
	value: string;
	label: string;
	href: Route;
}) {
	return (
		<li className="min-w-0">
			<Link
				href={href}
				className="group flex h-full flex-col gap-0.5 px-3 py-2.5 outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
			>
				<span className="font-semibold text-xl tabular-nums leading-none tracking-tight sm:text-2xl">
					{value}
				</span>
				<span className="truncate text-muted-foreground text-xs group-hover:text-foreground">
					{label}
				</span>
			</Link>
		</li>
	);
}

/**
 * The top of every author page. It is built from the cached, signed-out copy of the author, so
 * anything that depends on the viewer (follow state, admin tools) is a small client island.
 */
export function AuthorPageHero({ author }: { author: AuthorGetOutput }) {
	const f = useFormatters();
	const { profile, numbers } = author;
	const bornAt = profile.birth.place;
	const diedAt = profile.death.place;
	const places =
		bornAt && diedAt && bornAt !== diedAt
			? `${bornAt} to ${diedAt}`
			: (bornAt ?? diedAt);

	const slug = profile.slug;
	const tab = (id: AuthorTabId) => {
		const found = AUTHOR_TABS.find((entry) => entry.id === id);
		return (found ? authorTabHref(slug, found) : `/authors/${slug}`) as Route;
	};
	const photoCredit = [profile.photo?.credit, profile.photo?.license]
		.filter(Boolean)
		.join(", ");

	return (
		<header className="flex flex-col gap-5">
			<div className="flex gap-4 sm:gap-6">
				<div className="flex shrink-0 flex-col gap-1.5">
					<AuthorPhoto
						name={profile.name}
						photoUrl={profile.photo?.url ?? null}
						size="hero"
					/>
					{photoCredit ? (
						<p className="max-w-28 text-3xs text-muted-foreground leading-tight sm:max-w-44">
							{profile.photo?.sourceUrl ? (
								<a
									href={profile.photo.sourceUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="underline-offset-2 hover:underline"
								>
									{photoCredit}
								</a>
							) : (
								photoCredit
							)}
						</p>
					) : null}
				</div>

				<div className="flex min-w-0 flex-1 flex-col gap-3">
					<div className="flex flex-col gap-1">
						<p className="text-muted-foreground text-sm">Author</p>
						<h1 className="text-balance font-bold text-2xl tracking-tight sm:text-4xl">
							{profile.name}
						</h1>
						{profile.lifespan || profile.age.text ? (
							<p className="text-muted-foreground text-sm tabular-nums">
								{[profile.lifespan, profile.age.text]
									.filter(Boolean)
									.join(" · ")}
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
									<Badge variant="outline">
										{GENDER_LABEL[profile.gender]}
									</Badge>
								</li>
							) : null}
						</ul>
					) : null}

					<div className="mt-auto hidden flex-wrap items-center gap-2 sm:flex">
						<Actions
							slug={slug}
							followerCount={numbers.followerCount}
							name={profile.name}
						/>
					</div>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2 sm:hidden">
				<Actions
					slug={slug}
					followerCount={numbers.followerCount}
					name={profile.name}
				/>
			</div>

			<ul
				className="grid grid-cols-3 divide-x divide-y divide-border border border-border sm:grid-cols-6 sm:divide-y-0"
				aria-label="The club's numbers for this author"
			>
				<Figure
					href={tab("books")}
					value={compact.format(numbers.bookCount)}
					label={numbers.bookCount === 1 ? "book" : "books"}
				/>
				<Figure
					href={tab("reads")}
					value={compact.format(numbers.readerCount)}
					label={numbers.readerCount === 1 ? "reader" : "readers"}
				/>
				<Figure
					href={tab("reads")}
					value={compact.format(numbers.readCount)}
					label={numbers.readCount === 1 ? "read" : "reads"}
				/>
				<Figure
					href={tab("reviews")}
					value={compact.format(numbers.reviewCount)}
					label={numbers.reviewCount === 1 ? "review" : "reviews"}
				/>
				<Figure
					href={tab("stats")}
					value={
						numbers.averageRating != null
							? f.decimal(numbers.averageRating, 1)
							: "–"
					}
					label="average rating"
				/>
				<Figure
					href={tab("followers")}
					value={compact.format(numbers.followerCount)}
					label={numbers.followerCount === 1 ? "follower" : "followers"}
				/>
			</ul>
		</header>
	);
}

function Actions({
	slug,
	name,
	followerCount,
}: {
	slug: string;
	name: string;
	followerCount: number;
}) {
	return (
		<>
			<FollowAuthorButton
				slug={slug}
				initial={{ following: false, followerCount }}
			/>
			<ResourceShareMenu
				path={`/authors/${slug}`}
				shareText={name}
				label="Share author"
				shareInPost={{ kind: "author", slug }}
				size="md"
				iconOnly
			/>
			<AuthorPageAdminBar slug={slug} />
		</>
	);
}
