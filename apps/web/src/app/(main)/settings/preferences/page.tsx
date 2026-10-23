import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { PreferencesForm } from "@/components/blocks/preferences-form";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Preferences",
	description: "Theme, fonts, text size, reading and display options for BBRC.",
	path: "/settings/preferences",
	robots: NO_INDEX_ROBOTS,
});

/** Open to everyone: visitors keep their choices on their own device. */
export default function PreferencesPage() {
	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-8">
			<div>
				<Link
					href={"/settings" as Route}
					className="mb-4 inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-4" aria-hidden />
					Settings
				</Link>
				<h1 className="font-semibold text-2xl tracking-tight">Preferences</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Make BBRC look and read the way you like: colours, fonts, text size,
					motion and how dates are shown.
				</p>
			</div>

			<PreferencesForm />
		</div>
	);
}
