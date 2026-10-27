import { notFound, permanentRedirect } from "next/navigation";
import { AuthorPageHero } from "@/components/blocks/author/author-page-hero";
import { AuthorPageTabs } from "@/components/blocks/author/author-page-tabs";
import { loadAuthorForIsr } from "@/lib/isr-data";
import { authorJsonLd, breadcrumbJsonLd, JsonLd } from "@/lib/seo";
import { authorSameAs, dateForJsonLd } from "@/lib/seo/author-structured-data";
import { db } from "@/services";

/** ISR: keep in sync with `DETAIL_PAGE_REVALIDATE_SECONDS` in `@/lib/seo`. */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
	const rows = await db.author.findMany({
		where: { books: { some: {} } },
		select: { slug: true },
	});
	return rows.map(({ slug }) => ({ slug }));
}

export default async function AuthorLayout({
	children,
	params,
}: LayoutProps<"/[locale]/authors/[slug]">) {
	const { slug } = await params;

	const author = await loadAuthorForIsr(slug).catch(() => null);
	if (!author) {
		notFound();
	}

	// A merged, renamed or alias address: send it to the canonical page (308).
	if (author.redirectTo) {
		permanentRedirect(`/authors/${author.redirectTo}`);
	}

	const { profile, numbers } = author;

	return (
		<div className="flex flex-col gap-6">
			<JsonLd
				data={[
					authorJsonLd({
						name: profile.name,
						slug: profile.slug,
						bookCount: numbers.bookCount,
						description: profile.bio,
						aliases: profile.aliases,
						birthDate: dateForJsonLd(profile.birth),
						deathDate: dateForJsonLd(profile.death),
						birthPlace: profile.birth.place,
						deathPlace: profile.death.place,
						nationalities: profile.nationalities.map((country) => country.name),
						gender:
							profile.gender === "female" || profile.gender === "male"
								? profile.gender
								: null,
						image: profile.photo?.url ?? null,
						sameAs: authorSameAs(profile.links),
					}),
					breadcrumbJsonLd([
						{ name: "Authors", path: "/authors" },
						{ name: profile.name, path: `/authors/${profile.slug}` },
					]),
				]}
			/>
			<AuthorPageHero author={author} />
			<AuthorPageTabs slug={profile.slug} />
			{children}
		</div>
	);
}
