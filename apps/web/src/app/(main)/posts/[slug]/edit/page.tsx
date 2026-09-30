import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { EditPostForm } from "@/components/blocks/edit-post-form";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";
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

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
			<div className="flex flex-col gap-2">
				<Link
					href={`/posts/${slug}` as Route}
					className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
				>
					<ArrowLeft className="size-4" />
					Back to post
				</Link>
				<h1 className="font-bold text-2xl tracking-tight">Edit post</h1>
				<p className="text-muted-foreground text-sm">
					Only you can change or delete this post.
				</p>
			</div>

			<EditPostForm post={post} />
		</div>
	);
}
