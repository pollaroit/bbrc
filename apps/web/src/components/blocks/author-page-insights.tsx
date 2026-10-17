import type { GetAuthorPageOutput } from "@bbrc/api/modules/author/author.schema";
import type { Route } from "next";
import Link from "next/link";
import { UserPanel } from "@/components/blocks/user-panel";

type AuthorPageInsightsProps = {
	author: GetAuthorPageOutput;
};

function InsightSection({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3 border border-border bg-card p-4">
			<div className="flex flex-col gap-1">
				<h2 className="font-semibold text-sm tracking-tight">{title}</h2>
				<p className="text-muted-foreground text-xs leading-relaxed">
					{description}
				</p>
			</div>
			{children}
		</section>
	);
}

export function AuthorPageInsights({ author }: AuthorPageInsightsProps) {
	const hasAny =
		author.bestReaders.length > 0 ||
		author.biggestFans.length > 0 ||
		author.similarAuthors.length > 0;

	if (!hasAny) {
		return null;
	}

	return (
		<div className="grid gap-4 lg:grid-cols-3">
			<InsightSection
				title="Best readers"
				description="Members who have marked the most of this author’s books as read."
			>
				{author.bestReaders.length === 0 ? (
					<p className="text-muted-foreground text-sm">No reads yet.</p>
				) : (
					<ul className="flex flex-col gap-2">
						{author.bestReaders.map((reader) => (
							<li
								key={reader.username}
								className="flex items-center justify-between gap-2 border border-border px-2 py-1.5"
							>
								<Link
									href={`/users/${reader.username}` as Route}
									className="min-w-0 outline-offset-2"
								>
									<UserPanel user={reader} className="min-w-0" />
								</Link>
								<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
									{reader.readCount} read{reader.readCount === 1 ? "" : "s"}
								</span>
							</li>
						))}
					</ul>
				)}
			</InsightSection>

			<InsightSection
				title="Biggest fans"
				description="Highest average club ratings on this author’s books (among members who rated)."
			>
				{author.biggestFans.length === 0 ? (
					<p className="text-muted-foreground text-sm">No ratings yet.</p>
				) : (
					<ul className="flex flex-col gap-2">
						{author.biggestFans.map((fan) => (
							<li
								key={fan.username}
								className="flex items-center justify-between gap-2 border border-border px-2 py-1.5"
							>
								<Link
									href={`/users/${fan.username}` as Route}
									className="min-w-0 outline-offset-2"
								>
									<UserPanel user={fan} className="min-w-0" />
								</Link>
								<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
									{fan.averageRating.toFixed(1)} / 5 · {fan.ratingCount} rating
									{fan.ratingCount === 1 ? "" : "s"}
								</span>
							</li>
						))}
					</ul>
				)}
			</InsightSection>

			<InsightSection
				title="Similar authors"
				description="Authors whose books overlap thematically and structurally with this catalog."
			>
				{author.similarAuthors.length === 0 ? (
					<p className="text-muted-foreground text-sm">Not enough data yet.</p>
				) : (
					<ul className="flex flex-col gap-1.5">
						{author.similarAuthors.map((entry) => (
							<li key={entry.slug}>
								<Link
									href={`/authors/${entry.slug}` as Route}
									className="flex items-center justify-between gap-2 border border-border px-2 py-1.5 text-sm transition-colors hover:bg-muted/30"
								>
									<span className="font-medium">{entry.name}</span>
									<span className="text-muted-foreground text-xs tabular-nums">
										{entry.bookCount} book{entry.bookCount === 1 ? "" : "s"}
									</span>
								</Link>
							</li>
						))}
					</ul>
				)}
			</InsightSection>
		</div>
	);
}
