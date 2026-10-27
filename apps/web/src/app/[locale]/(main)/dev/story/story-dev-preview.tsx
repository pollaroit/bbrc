/** biome-ignore-all lint/performance/noImgElement: dev-only story preview */
"use client";

import { useState } from "react";
import { bookStoryPath } from "@/lib/story/constants";

type StoryDevPreviewProps = {
	defaultBookSlug?: string;
};

export function StoryDevPreview({
	defaultBookSlug = "",
}: StoryDevPreviewProps) {
	const [bookSlug, setBookSlug] = useState(defaultBookSlug);
	const trimmed = bookSlug.trim();
	const storySrc = trimmed ? bookStoryPath(trimmed) : null;

	return (
		<div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
			<div className="space-y-2">
				<h1 className="font-bold text-2xl tracking-tight">
					Story image preview
				</h1>
				<p className="text-muted-foreground text-sm">
					9:16 cards for Instagram Stories. Sign in and rate a book to preview
					stars in the footer. Production serves the same URLs at{" "}
					<code className="text-foreground">/story/book/[slug]</code>.
				</p>
				<p className="text-muted-foreground text-sm">
					Also on{" "}
					<a
						href="/dev/og"
						className="text-primary underline-offset-4 hover:underline"
					>
						/dev/og
					</a>{" "}
					for link previews.
				</p>
			</div>

			<label className="flex max-w-md flex-col gap-1.5 text-sm">
				<span className="font-medium">Book slug</span>
				<input
					className="border border-border bg-background px-3 py-2 font-mono text-sm"
					value={bookSlug}
					onChange={(event) => setBookSlug(event.target.value)}
					placeholder="e.g. dune"
				/>
			</label>

			{storySrc ? (
				<article className="flex flex-col gap-4 border border-border bg-card p-4">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<h2 className="font-semibold text-lg">Instagram Story card</h2>
						<code className="text-muted-foreground text-xs">{storySrc}</code>
					</div>
					<div className="mx-auto w-full max-w-[360px] border border-border bg-muted/30">
						<img
							src={storySrc}
							alt=""
							width={1080}
							height={1920}
							className="h-auto w-full"
						/>
					</div>
					<div className="flex flex-wrap gap-2 text-sm">
						<a
							className="text-primary underline-offset-4 hover:underline"
							href={storySrc}
							target="_blank"
							rel="noreferrer"
						>
							Open story PNG
						</a>
						{trimmed ? (
							<a
								className="text-primary underline-offset-4 hover:underline"
								href={`/books/${trimmed}`}
								target="_blank"
								rel="noreferrer"
							>
								Open book page
							</a>
						) : null}
					</div>
				</article>
			) : (
				<p className="text-muted-foreground text-sm">
					Enter a book slug to preview.
				</p>
			)}
		</div>
	);
}
