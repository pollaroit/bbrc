import type { Route } from "next";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
	title: "RSS feeds",
	description: "Subscribe to BBRC books and club posts.",
	path: "/feed",
});

const feeds = [
	{
		href: "/feed/posts" as Route,
		title: "Club posts",
		description: "Latest posts from the member feed.",
	},
	{
		href: "/feed/books" as Route,
		title: "Library books",
		description: "Recently added books in the catalog.",
	},
] as const;

export default function FeedIndexPage() {
	return (
		<div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10">
			<div>
				<h1 className="font-bold text-2xl">RSS feeds</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Add these URLs to your feed reader. The same feeds are also available
					with an <code className="text-xs">.xml</code> suffix.
				</p>
			</div>
			<ul className="flex flex-col gap-4">
				{feeds.map((feed) => (
					<li key={feed.href} className="border border-border p-4">
						<h2 className="font-semibold">{feed.title}</h2>
						<p className="mt-1 text-muted-foreground text-sm">
							{feed.description}
						</p>
						<p className="mt-3 font-mono text-sm">
							<Link
								href={feed.href}
								className="underline-offset-2 hover:underline"
							>
								{feed.href}
							</Link>
						</p>
					</li>
				))}
			</ul>
		</div>
	);
}
