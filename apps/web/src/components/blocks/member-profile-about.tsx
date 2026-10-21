"use client";

import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { contentPlainText, genres, socialSites } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Cake, Gauge, Globe, MapPin, UserRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { RichContentView } from "@/components/blocks/rich-content-view";
import { cn } from "@/lib/utils";

type Profile = GetUserByUsernameOutput["profile"];

type MemberProfileAboutProps = {
	profile: Profile;
	isOwnProfile: boolean;
	className?: string;
};

const BIO_COLLAPSE_CHARS = 180;
const GENRE_COLLAPSED_COUNT = 6;

const genderLabels = {
	male: "Male",
	female: "Female",
} as const;

const birthFormatter = new Intl.DateTimeFormat("en", {
	dateStyle: "long",
	timeZone: "UTC",
});

type GenreChip = { slug: string; name: string; sub: boolean };

function buildGenreChips(profile: Profile): GenreChip[] {
	const selectedGenres = new Set(profile.favoriteGenres);
	const selectedSubs = new Set(profile.favoriteSubgenres);

	return genres.flatMap((genre) => {
		if (!selectedGenres.has(genre.slug)) return [];
		const subs = (genre.subgenres ?? [])
			.filter((sub) => selectedSubs.has(sub.slug))
			.map((sub) => ({ slug: sub.slug, name: sub.name, sub: true }));
		return [{ slug: genre.slug, name: genre.name, sub: false }, ...subs];
	});
}

function hostLabel(url: string) {
	try {
		return new URL(url).host.replace(/^www\./, "");
	} catch {
		return url;
	}
}

export function MemberProfileAbout({
	profile,
	isOwnProfile,
	className,
}: MemberProfileAboutProps) {
	const [bioOpen, setBioOpen] = useState(false);
	const [genresOpen, setGenresOpen] = useState(false);

	const hasBio = contentPlainText(profile.bio ?? "").trim().length > 0;
	const bioIsLong =
		hasBio && contentPlainText(profile.bio ?? "").length > BIO_COLLAPSE_CHARS;

	const chips = buildGenreChips(profile);
	const visibleChips = genresOpen
		? chips
		: chips.slice(0, GENRE_COLLAPSED_COUNT);
	const hiddenChipCount = chips.length - visibleChips.length;

	const links = profile.socialLinks.flatMap((link) => {
		const site = socialSites.find((item) => item.slug === link.site);
		return site ? [{ key: site.slug, label: site.name, href: link.url }] : [];
	});

	const meta = [
		profile.location
			? { key: "location", Icon: MapPin, text: profile.location }
			: null,
		profile.dateOfBirth
			? {
					key: "born",
					Icon: Cake,
					text: `Born ${birthFormatter.format(profile.dateOfBirth)}`,
				}
			: null,
		profile.gender !== "not_specified"
			? { key: "gender", Icon: UserRound, text: genderLabels[profile.gender] }
			: null,
		{ key: "wpm", Icon: Gauge, text: `${profile.wpm} WPM` },
	].filter((item) => item !== null);

	const website = profile.websiteUrl
		? { href: profile.websiteUrl, label: hostLabel(profile.websiteUrl) }
		: null;

	const isEmpty =
		!hasBio && chips.length === 0 && links.length === 0 && !website;

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			<ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-muted-foreground text-sm">
				{meta.map(({ key, Icon, text }) => (
					<li key={key} className="flex items-center gap-1.5">
						<Icon className="size-4 shrink-0" aria-hidden />
						{text}
					</li>
				))}
				{website ? (
					<li className="flex items-center gap-1.5">
						<Globe className="size-4 shrink-0" aria-hidden />
						<a
							href={website.href}
							target="_blank"
							rel="noopener noreferrer nofollow"
							className="font-medium text-foreground underline underline-offset-4"
						>
							{website.label}
						</a>
					</li>
				) : null}
			</ul>

			{hasBio ? (
				<div>
					<div
						className={cn(
							"text-sm leading-relaxed",
							bioIsLong && !bioOpen && "line-clamp-3",
						)}
					>
						<RichContentView content={profile.bio ?? ""} />
					</div>
					{bioIsLong ? (
						<button
							type="button"
							aria-expanded={bioOpen}
							className="mt-1 font-medium text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
							onClick={() => setBioOpen((open) => !open)}
						>
							{bioOpen ? "Show less" : "Read more"}
						</button>
					) : null}
				</div>
			) : null}

			{chips.length > 0 ? (
				<div className="flex flex-wrap items-center gap-1.5">
					{visibleChips.map((chip) => (
						<span
							key={chip.slug}
							className={cn(
								"border px-2.5 py-1 text-xs",
								chip.sub
									? "border-pink-300 border-dashed text-pink-800 dark:border-pink-800 dark:text-pink-200"
									: "border-pink-600 bg-pink-500 text-white",
							)}
						>
							{chip.name}
						</span>
					))}
					{hiddenChipCount > 0 || genresOpen ? (
						<button
							type="button"
							aria-expanded={genresOpen}
							className="px-1.5 py-1 font-medium text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground"
							onClick={() => setGenresOpen((open) => !open)}
						>
							{genresOpen ? "Show fewer" : `+${hiddenChipCount} more`}
						</button>
					) : null}
				</div>
			) : null}

			{links.length > 0 ? (
				<ul className="flex flex-wrap gap-1.5">
					{links.map((link) => (
						<li key={link.key}>
							<a
								href={link.href}
								target="_blank"
								rel="noopener noreferrer nofollow"
								className="inline-flex items-center border border-border px-2.5 py-1 font-medium text-xs transition-colors hover:bg-muted/50"
							>
								{link.label}
							</a>
						</li>
					))}
				</ul>
			) : null}

			{isOwnProfile && isEmpty ? (
				<div className="flex flex-col items-start gap-2 border border-border border-dashed p-4 text-sm">
					<p className="text-muted-foreground">
						Add a bio, favorite genres and links so other readers get to know
						you.
					</p>
					<Button
						variant="outline"
						size="sm"
						nativeButton={false}
						render={<Link href={"/settings/profile" as Route} />}
					>
						Complete your profile
					</Button>
				</div>
			) : null}
		</div>
	);
}
