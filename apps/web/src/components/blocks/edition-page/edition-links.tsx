import type { EditionExternalLink } from "@bbrc/api/modules/edition/edition.schema";
import {
	Archive,
	BookOpenText,
	ExternalLink,
	Globe2,
	Landmark,
	Library,
	type LucideIcon,
	Search,
} from "lucide-react";
import { EditionSection } from "@/components/blocks/edition-page/section";

const ICONS: Record<EditionExternalLink["id"], LucideIcon> = {
	open_library: Globe2,
	internet_archive: Archive,
	internet_archive_search: Search,
	worldcat: Library,
	google_books: BookOpenText,
	goodreads: BookOpenText,
	librarything: BookOpenText,
	library_of_congress: Landmark,
};

/** Services that cost nothing to look at (borrowing and previews are free). */
const FREE = new Set<EditionExternalLink["id"]>([
	"open_library",
	"internet_archive",
	"internet_archive_search",
	"worldcat",
	"google_books",
	"library_of_congress",
]);

/** Where to find this edition: libraries, free scans and catalogues, never shops. */
export function EditionLinks({ links }: { links: EditionExternalLink[] }) {
	if (links.length === 0) return null;

	return (
		<EditionSection
			id="edition-links"
			title="Where to find it"
			description="Libraries and free sources. These open another website."
		>
			<ul className="flex flex-col divide-y divide-border border border-border">
				{links.map((link) => {
					const Icon = ICONS[link.id];
					return (
						<li key={link.id}>
							<a
								href={link.href}
								target="_blank"
								rel="noreferrer noopener"
								className="group flex items-start gap-3 p-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
							>
								<Icon
									className="mt-0.5 size-4 shrink-0 text-muted-foreground"
									aria-hidden
								/>
								<span className="flex min-w-0 flex-1 flex-col gap-0.5">
									<span className="flex items-center gap-2 font-medium text-sm">
										{link.label}
										{FREE.has(link.id) ? (
											<span className="border border-success/40 bg-success/10 px-1 text-3xs text-success-ink">
												free
											</span>
										) : null}
									</span>
									<span className="text-muted-foreground text-xs leading-snug">
										{link.hint}
									</span>
								</span>
								<ExternalLink
									className="mt-0.5 size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground"
									aria-hidden
								/>
								<span className="sr-only">(opens another website)</span>
							</a>
						</li>
					);
				})}
			</ul>
		</EditionSection>
	);
}
