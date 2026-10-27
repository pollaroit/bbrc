import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { PollStats } from "@/components/blocks/poll-stats";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
} from "@/lib/seo";
import { auth } from "@/services";
import { orpc } from "@/utils/orpc";

const loadPostBySlug = cache((slug: string) =>
	orpc.post.getPostBySlug.call(slug),
);

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/posts/[slug]/poll/stats">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const post = await loadPostBySlug(slug);

		return buildPageMetadata({
			title: "Poll stats",
			description: `Results and turnout for a poll by ${post.author.name}.`,
			path: `/posts/${post.slug}/poll/stats`,
			robots: NO_INDEX_ROBOTS,
		});
	} catch {
		return buildNotFoundMetadata("Post");
	}
}

export default async function PollStatsPage({
	params,
}: PageProps<"/[locale]/posts/[slug]/poll/stats">) {
	const { slug } = await params;

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	let post: Awaited<ReturnType<typeof loadPostBySlug>>;

	try {
		post = await loadPostBySlug(slug);
	} catch {
		notFound();
	}

	if (!post.poll) {
		notFound();
	}

	// The API only answers the owner and admins; this keeps everyone else off the page.
	if (!session?.user) {
		redirect(`/posts/${slug}` as Route);
	}

	return <PollStats postSlug={slug} />;
}
