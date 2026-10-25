import type {
	AuthorAboutOutput,
	AuthorProfile,
} from "@bbrc/api/modules/author/author.schema";
import { Badge } from "@bbrc/ui/components/badge";
import { ExternalLink } from "lucide-react";
import { AuthorPageEmpty, AuthorPageSection } from "./author-page-bits";

const EXCERPT_LENGTH = 380;

function excerptOf(text: string): string {
	if (text.length <= EXCERPT_LENGTH) {
		return text;
	}
	const cut = text.slice(0, EXCERPT_LENGTH);
	const sentence = cut.lastIndexOf(". ");
	return `${(sentence > 160 ? cut.slice(0, sentence + 1) : cut.slice(0, cut.lastIndexOf(" ")).trimEnd()).trimEnd()}${sentence > 160 ? "" : "…"}`;
}

/** The bio with its credit line: Wikipedia text always says where it came from. */
export function AuthorPageBio({
	profile,
	excerpt = false,
}: {
	profile: AuthorProfile;
	excerpt?: boolean;
}) {
	if (!profile.bio) {
		return null;
	}
	const paragraphs = (excerpt ? excerptOf(profile.bio) : profile.bio)
		.split(/\n{2,}/)
		.filter(Boolean);

	return (
		<div className="flex max-w-prose flex-col gap-2">
			{paragraphs.map((paragraph) => (
				<p key={paragraph.slice(0, 40)} className="text-sm leading-relaxed">
					{paragraph}
				</p>
			))}
			<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
				{profile.bioAttribution ? (
					<span>
						{profile.bioAttribution.url ? (
							<a
								href={profile.bioAttribution.url}
								target="_blank"
								rel="noreferrer noopener"
								className="underline underline-offset-4 hover:text-foreground"
							>
								{profile.bioAttribution.label}
							</a>
						) : (
							profile.bioAttribution.label
						)}
						. {profile.bioAttribution.licenseNote}
					</span>
				) : null}
				{profile.bioSource === "ai" ? (
					<Badge variant="outline">AI-assisted</Badge>
				) : null}
			</p>
		</div>
	);
}

function Fact({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid gap-0.5 border-border border-b py-2 sm:grid-cols-[9rem_1fr] sm:gap-4">
			<dt className="text-muted-foreground text-sm">{label}</dt>
			<dd className="text-sm">{children}</dd>
		</div>
	);
}

function dateLine(date: AuthorProfile["birth"]): string | null {
	const parts = [date.text, date.place].filter(Boolean);
	return parts.length > 0 ? parts.join(" in ") : null;
}

export function AuthorPageAboutPanel({
	profile,
	about,
	children,
}: {
	profile: AuthorProfile;
	about: AuthorAboutOutput;
	/** Extra content for the sources block (the admin notes island). */
	children?: React.ReactNode;
}) {
	const born = dateLine(profile.birth);
	const died = dateLine(profile.death);
	const hasFacts =
		born ||
		died ||
		profile.nationalities.length > 0 ||
		profile.gender ||
		profile.aliases.length > 0 ||
		profile.sortName;

	return (
		<div className="flex flex-col gap-8">
			{profile.bio ? (
				<AuthorPageSection title="Biography">
					<AuthorPageBio profile={profile} />
				</AuthorPageSection>
			) : (
				<AuthorPageEmpty>
					No biography yet. It is added automatically for new authors and can be
					written by an admin.
				</AuthorPageEmpty>
			)}

			{hasFacts ? (
				<AuthorPageSection title="Details">
					<dl className="max-w-3xl border-border border-t">
						{born ? <Fact label="Born">{born}</Fact> : null}
						{died ? <Fact label="Died">{died}</Fact> : null}
						{profile.age.text ? (
							<Fact label="Age">{profile.age.text}</Fact>
						) : null}
						{profile.nationalities.length > 0 ? (
							<Fact label="Nationality">
								{profile.nationalities.map((c) => c.name).join(", ")}
							</Fact>
						) : null}
						{profile.gender ? (
							<Fact label="Gender">
								{profile.gender === "non_binary"
									? "Non-binary"
									: profile.gender[0]?.toUpperCase() + profile.gender.slice(1)}
							</Fact>
						) : null}
						{profile.aliases.length > 0 ? (
							<Fact label="Also written as">{profile.aliases.join(", ")}</Fact>
						) : null}
						{profile.sortName ? (
							<Fact label="Filed under">{profile.sortName}</Fact>
						) : null}
					</dl>
				</AuthorPageSection>
			) : null}

			{profile.links.length > 0 ? (
				<AuthorPageSection title="Elsewhere">
					<ul className="flex flex-wrap gap-2">
						{profile.links.map((link) => (
							<li key={link.kind}>
								<a
									href={link.url}
									target="_blank"
									rel="noreferrer noopener"
									className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1.5 text-sm transition-colors hover:bg-muted/40"
								>
									{link.label}
									<ExternalLink
										className="size-3.5 text-muted-foreground"
										aria-hidden
									/>
									<span className="sr-only">(opens another website)</span>
								</a>
							</li>
						))}
					</ul>
				</AuthorPageSection>
			) : null}

			<AuthorPageSection
				title="Where this comes from"
				description="Details are gathered from open sources. Anything marked AI-assisted was written from those sources, never from memory."
			>
				<div className="flex max-w-3xl flex-col gap-3">
					<p className="text-sm">
						{about.verified
							? "An admin has checked these details."
							: about.autoFilled
								? "These details were filled in automatically and have not been checked by an admin yet."
								: "These details have not been checked by an admin yet."}
					</p>

					{about.sources.length > 0 ? (
						<ul className="flex flex-col border-border border-t">
							{about.sources.map((entry) => (
								<li
									key={entry.field}
									className="flex items-center justify-between gap-3 border-border border-b py-1.5 text-sm"
								>
									<span>{entry.label}</span>
									<span className="flex items-center gap-2 text-muted-foreground text-xs">
										{entry.source === "ai" ? (
											<Badge variant="outline">AI-assisted</Badge>
										) : entry.source === "admin" ? null : (
											<Badge variant="outline">Filled in automatically</Badge>
										)}
										{entry.sourceLabel}
									</span>
								</li>
							))}
						</ul>
					) : null}

					{about.credits.photo ? (
						<p className="text-muted-foreground text-xs">
							Photo
							{about.credits.photo.credit
								? ` by ${about.credits.photo.credit}`
								: ""}
							{about.credits.photo.license
								? `, ${about.credits.photo.license}`
								: ""}
							{about.credits.photo.sourceUrl ? (
								<>
									{" "}
									<a
										href={about.credits.photo.sourceUrl}
										target="_blank"
										rel="noreferrer noopener"
										className="underline underline-offset-4 hover:text-foreground"
									>
										Source
									</a>
								</>
							) : null}
							.
						</p>
					) : null}

					{children}
				</div>
			</AuthorPageSection>
		</div>
	);
}
