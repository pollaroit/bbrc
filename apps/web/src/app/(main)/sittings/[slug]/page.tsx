import type { Metadata } from "next";
import { cache } from "react";
import { SittingDetail } from "@/components/blocks/sitting-detail";
import { orpc } from "@/utils/orpc";

const loadSittingBySlug = cache((slug: string) =>
	orpc.sitting.getSittingBySlug.call(slug),
);

export async function generateMetadata({
	params,
}: PageProps<"/sittings/[slug]">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const sitting = await loadSittingBySlug(slug);

		return {
			title: sitting.slug,
			description: `BBRC sitting · ${sitting.participants.length} participants.`,
		};
	} catch {
		return {
			title: "Sitting not found",
			description: "This sitting could not be found.",
		};
	}
}

export default async function SittingPage({
	params,
}: PageProps<"/sittings/[slug]">) {
	const { slug } = await params;
	const sitting = await loadSittingBySlug(slug);

	return <SittingDetail sitting={sitting} />;
}
