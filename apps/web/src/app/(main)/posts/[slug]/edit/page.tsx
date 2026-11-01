import { getPostBySlug } from "@bbrc/api/modules/post/post.service";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { EditPostForm } from "@/components/blocks/edit-post-form";
import { getRequestViewer } from "@/lib/request-viewer";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
} from "@/lib/seo";
import { auth, db } from "@/services";

const loadPostForEdit = cache(async (slug: string) =>
	getPostBySlug(slug, db, await getRequestViewer()),
);

export async function generateMetadata({
	params,
}: PageProps<"/posts/[slug]/edit">): Promise<Metadata> {
	const { slug } = await params;

	try {
		const post = await loadPostForEdit(slug);

		return buildPageMetadata({
			title: post.status === "scheduled" ? "Edit scheduled post" : "Edit post",
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

	let post: Awaited<ReturnType<typeof loadPostForEdit>>;

	try {
		post = await loadPostForEdit(slug);
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
