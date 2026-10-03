/** biome-ignore-all lint/performance/noImgElement: dev-only OG preview */
"use client";

import { useMemo, useState } from "react";
import { ogPathFromPagePath } from "@/lib/seo/og/paths";

type OgDevPreviewProps = {
	staticPaths: { label: string; path: string }[];
	samples: {
		bookSlug?: string;
		postSlug?: string;
		commentSlug?: string;
		feedbackSlug?: string;
		sittingSlug?: string;
		username?: string;
		shelfSlug?: string;
		shelfUsername?: string;
	};
};

function SocialCardPreview({
	pagePath,
	pageUrl,
	ogSrc,
	title,
	description,
}: {
	pagePath: string;
	pageUrl: string;
	ogSrc: string;
	title: string;
	description: string;
}) {
	return (
		<article className="flex flex-col gap-3 border border-border bg-card p-4">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 className="font-semibold text-lg">{title}</h2>
				<code className="text-muted-foreground text-xs">{pagePath}</code>
			</div>
			<p className="text-muted-foreground text-sm">{description}</p>
			<div className="overflow-hidden border border-border bg-muted/30">
				{/* eslint-disable-next-line @next/next/no-img-element -- dev-only OG preview */}
				<img
					src={ogSrc}
					alt=""
					width={1200}
					height={630}
					className="h-auto w-full"
				/>
			</div>
			<div className="border border-border bg-background p-3 text-sm">
				<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
					Link preview (approx.)
				</p>
				<p className="mt-1 truncate text-muted-foreground text-xs">{pageUrl}</p>
				<p className="mt-2 font-semibold">{title}</p>
				<p className="line-clamp-2 text-muted-foreground">{description}</p>
			</div>
			<div className="flex flex-wrap gap-2 text-sm">
				<a
					className="text-primary underline-offset-4 hover:underline"
					href={ogSrc}
					target="_blank"
					rel="noreferrer"
				>
					Open OG image
				</a>
				<a
					className="text-primary underline-offset-4 hover:underline"
					href={pageUrl}
					target="_blank"
					rel="noreferrer"
				>
					Open page
				</a>
			</div>
		</article>
	);
}

export function OgDevPreview({ staticPaths, samples }: OgDevPreviewProps) {
	const [bookSlug, setBookSlug] = useState(samples.bookSlug ?? "");
	const [postSlug, setPostSlug] = useState(samples.postSlug ?? "");
	const [commentSlug, setCommentSlug] = useState(samples.commentSlug ?? "");
	const [feedbackSlug, setFeedbackSlug] = useState(samples.feedbackSlug ?? "");
	const [sittingSlug, setSittingSlug] = useState(samples.sittingSlug ?? "");
	const [username, setUsername] = useState(samples.username ?? "");
	const [shelfSlug, setShelfSlug] = useState(samples.shelfSlug ?? "");
	const [shelfUsername, setShelfUsername] = useState(
		samples.shelfUsername ?? "",
	);

	const dynamicEntries = useMemo(() => {
		const entries: { label: string; path: string; description: string }[] = [];
		if (bookSlug.trim()) {
			entries.push({
				label: "Book",
				path: `/books/${bookSlug.trim()}`,
				description: "Library detail page OG.",
			});
		}
		if (postSlug.trim()) {
			const post = postSlug.trim();
			entries.push({
				label: "Post",
				path: `/posts/${post}`,
				description: "Club post OG.",
			});
			if (commentSlug.trim()) {
				entries.push({
					label: "Comment",
					path: `/posts/${post}/comments/${commentSlug.trim()}`,
					description: "Permalink comment thread OG.",
				});
			}
		}
		if (bookSlug.trim() && feedbackSlug.trim()) {
			const book = bookSlug.trim();
			const feedback = feedbackSlug.trim();
			entries.push({
				label: "Book review",
				path: `/books/${book}/feedbacks/${feedback}`,
				description: "Club feedback permalink OG.",
			});
			if (commentSlug.trim()) {
				entries.push({
					label: "Review comment",
					path: `/books/${book}/feedbacks/${feedback}/comments/${commentSlug.trim()}`,
					description: "Comment on a club review OG.",
				});
			}
		}
		if (sittingSlug.trim()) {
			const slug = sittingSlug.trim();
			entries.push(
				{
					label: "Sitting",
					path: `/sittings/${slug}`,
					description: "Reading sitting OG.",
				},
				{
					label: "Sitting vote",
					path: `/sittings/${slug}/vote`,
					description: "Sitting voting / results OG.",
				},
				{
					label: "Sitting participants",
					path: `/sittings/${slug}/participants`,
					description: "Sitting participants OG.",
				},
			);
		}
		if (username.trim()) {
			const u = username.trim();
			entries.push(
				{
					label: "Member",
					path: `/users/${u}`,
					description: "Member profile OG.",
				},
				{
					label: "XP",
					path: `/users/${u}/xp`,
					description: "XP history OG.",
				},
				{
					label: "RP",
					path: `/users/${u}/rp`,
					description: "RP history OG.",
				},
				{
					label: "Shelves list",
					path: `/users/${u}/shelves`,
					description: "Member shelves index OG.",
				},
			);
		}
		const shelfOwner = shelfUsername.trim() || username.trim();
		if (shelfOwner && shelfSlug.trim()) {
			entries.push({
				label: "Shelf",
				path: `/users/${shelfOwner}/shelves/${shelfSlug.trim()}`,
				description: "Public shelf detail OG.",
			});
		}
		return entries;
	}, [
		bookSlug,
		commentSlug,
		feedbackSlug,
		postSlug,
		shelfSlug,
		shelfUsername,
		sittingSlug,
		username,
	]);

	const cacheBust = Date.now();

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
			<header className="flex flex-col gap-2">
				<h1 className="font-semibold text-2xl">Open Graph preview</h1>
				<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
					Images are generated at <code className="bg-muted px-1">/og/…</code>{" "}
					(mirrors page paths). Metadata on each route points crawlers to the
					same URL, so you can iterate locally without deploying or pasting
					links into WhatsApp.
				</p>
			</header>

			<section className="grid gap-4 border border-border p-4 md:grid-cols-2">
				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium">Book slug</span>
					<input
						className="border border-input bg-background px-3 py-2"
						value={bookSlug}
						onChange={(e) => setBookSlug(e.target.value)}
						placeholder="e.g. dune"
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium">Post slug</span>
					<input
						className="border border-input bg-background px-3 py-2"
						value={postSlug}
						onChange={(e) => setPostSlug(e.target.value)}
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium">Feedback slug</span>
					<input
						className="border border-input bg-background px-3 py-2"
						value={feedbackSlug}
						onChange={(e) => setFeedbackSlug(e.target.value)}
						placeholder="Requires book slug above"
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium">Comment slug</span>
					<input
						className="border border-input bg-background px-3 py-2"
						value={commentSlug}
						onChange={(e) => setCommentSlug(e.target.value)}
						placeholder="Requires post slug above"
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium">Sitting slug</span>
					<input
						className="border border-input bg-background px-3 py-2"
						value={sittingSlug}
						onChange={(e) => setSittingSlug(e.target.value)}
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium">Username</span>
					<input
						className="border border-input bg-background px-3 py-2"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium">Shelf slug</span>
					<input
						className="border border-input bg-background px-3 py-2"
						value={shelfSlug}
						onChange={(e) => setShelfSlug(e.target.value)}
						placeholder="Requires shelf owner username"
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm">
					<span className="font-medium">Shelf owner username</span>
					<input
						className="border border-input bg-background px-3 py-2"
						value={shelfUsername}
						onChange={(e) => setShelfUsername(e.target.value)}
						placeholder="Defaults to username above"
					/>
				</label>
			</section>

			<section className="grid gap-6 lg:grid-cols-2">
				{staticPaths.map(({ label, path }) => {
					const ogPath = ogPathFromPagePath(path);
					const ogSrc = `${ogPath}?v=${cacheBust}`;
					return (
						<SocialCardPreview
							key={path}
							pagePath={path}
							pageUrl={path}
							ogSrc={ogSrc}
							title={label}
							description="Static route"
						/>
					);
				})}
				{dynamicEntries.map(({ label, path, description }) => {
					const ogPath = ogPathFromPagePath(path);
					const ogSrc = `${ogPath}?v=${cacheBust}`;
					return (
						<SocialCardPreview
							key={path}
							pagePath={path}
							pageUrl={path}
							ogSrc={ogSrc}
							title={label}
							description={description}
						/>
					);
				})}
			</section>
		</div>
	);
}
