import type { EditionCore } from "@bbrc/api/modules/edition/edition.schema";
import { EditionSection } from "@/components/blocks/edition-page/section";

function Ident({ label, values }: { label: string; values: string[] }) {
	if (values.length === 0) return null;
	return (
		<div className="flex flex-col gap-0.5 border border-border p-3">
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="break-all font-mono text-xs tabular-nums">
				{values.slice(0, 4).join(", ")}
			</dd>
		</div>
	);
}

/** The edition's own words: description, notes, and the catalogue numbers behind it. */
export function EditionDetails({ edition }: { edition: EditionCore }) {
	const { identifiers } = edition;
	const hasIdentifiers =
		identifiers.oclc.length +
			identifiers.lccn.length +
			identifiers.goodreads.length +
			identifiers.librarything.length >
			0 || identifiers.ocaid != null;

	if (!edition.description && !edition.notes && !hasIdentifiers) return null;

	return (
		<EditionSection id="edition-details" title="Details">
			{edition.description ? (
				<div className="flex flex-col gap-1">
					<h3 className="font-medium text-sm">Description</h3>
					<p className="max-w-prose whitespace-pre-line text-pretty text-sm leading-relaxed">
						{edition.description}
					</p>
				</div>
			) : null}
			{edition.notes ? (
				<div className="flex flex-col gap-1">
					<h3 className="font-medium text-sm">
						{edition.source === "member" ? "Added with this note" : "Notes"}
					</h3>
					<p className="max-w-prose whitespace-pre-line text-pretty text-sm leading-relaxed">
						{edition.notes}
					</p>
				</div>
			) : null}
			{hasIdentifiers ? (
				<dl className="grid gap-2 sm:grid-cols-2">
					<Ident label="OCLC / WorldCat" values={identifiers.oclc} />
					<Ident label="Library of Congress" values={identifiers.lccn} />
					<Ident label="Goodreads" values={identifiers.goodreads} />
					<Ident label="LibraryThing" values={identifiers.librarything} />
					<Ident
						label="Internet Archive"
						values={identifiers.ocaid ? [identifiers.ocaid] : []}
					/>
				</dl>
			) : null}
		</EditionSection>
	);
}
