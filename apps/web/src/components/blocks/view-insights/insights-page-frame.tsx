import type { ViewResourceKind } from "@bbrc/shared";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { ViewInsightsView } from "./view-insights-view";

const BACK_LABEL: Record<ViewResourceKind, string> = {
	book: "Back to the book",
	post: "Back to the post",
	shelf: "Back to the shelf",
	review: "Back to the review",
	user: "Back to the profile",
};

/** The header and body every insights page shares. */
export function InsightsPageFrame({
	resource,
	reference,
	title,
	href,
}: {
	resource: ViewResourceKind;
	reference: string;
	title: string;
	href: string;
}) {
	return (
		<div className="flex flex-col gap-5">
			<header className="flex flex-col gap-2">
				<Link
					href={href as Route}
					className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
				>
					<ArrowLeft className="size-4" aria-hidden />
					{BACK_LABEL[resource]}
				</Link>
				<div className="flex flex-col gap-0.5">
					<h1 className="font-heading font-semibold text-2xl tracking-tight">
						Insights
					</h1>
					<p className="line-clamp-2 text-muted-foreground text-sm">{title}</p>
				</div>
			</header>
			<ListingSearchParamsBoundary>
				<ViewInsightsView resource={resource} reference={reference} />
			</ListingSearchParamsBoundary>
		</div>
	);
}
