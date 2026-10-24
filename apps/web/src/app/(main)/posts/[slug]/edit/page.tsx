import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { EditPostForm } from "@/components/blocks/edit-post-form";
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
}: PageProps<"/posts/[slug]/edit">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const post = await loadPostBySlug(slug);

		return buildPageMetadata({
			title: "Edit post",
			description: `Edit your BBRC post by ${post.author.name}.`,
			path: `/posts/${post.slug}/edit`,
			robots: NO_INDEX_ROBOTS,
		});
	} catch {
		return buildNotFoundMetadata("Post");
	}
}

export default async function EditPostPage({
	params,
}: PageProps<"/posts/[slug]/edit">) {
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

	if (!session?.user.username) {
		redirect(`/posts/${slug}` as Route);
	}

	if (post.author.username !== session.user.username) {
		redirect(`/posts/${slug}` as Route);
	}

	return <EditPostForm post={post} />;
}
