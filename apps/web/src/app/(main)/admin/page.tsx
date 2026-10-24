import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const metadata: Metadata = buildPageMetadata({
	title: "Admin dashboard",
	description: "Club administration hub.",
	path: "/admin",
	robots: NO_INDEX_ROBOTS,
});

const resources = [
	{
		href: "/admin/users" as Route,
		title: "Members",
		description: "Membership, roles, status, and engagement counts.",
	},
	{
		href: "/admin/books" as Route,
		title: "Books",
		description: "Catalog overview, rankings, list, and stats.",
	},
	{
		href: "/admin/series" as Route,
		title: "Series",
		description: "Multi-book reading order and list badges.",
	},
	{
		href: "/admin/sittings" as Route,
		title: "Sittings",
		description: "Reading cycles, polls, participation, and timelines.",
	},
	{
		href: "/admin/feedbacks" as Route,
		title: "Feedbacks",
		description: "Club reviews, ratings, likes, and discussion depth.",
	},
	{
		href: "/admin/shelves" as Route,
		title: "Shelves",
		description: "Member lists, book counts, covers, and shelf engagement.",
	},
	{
		href: "/admin/posts" as Route,
		title: "Posts",
		description: "Club feed posts, attachments, likes, and edits.",
	},
	{
		href: "/admin/comments" as Route,
		title: "Comments",
		description: "Post and feedback threads, depth, likes, and edits.",
	},
	{
		href: "/admin/documents" as Route,
		title: "Documents",
		description: "Book document submissions, review status, and languages.",
	},
	{
		href: "/admin/views" as Route,
		title: "Views",
		description: "Site-wide views, a list of every view, and audience stats.",
	},
	{
		href: "/admin/facts/create" as Route,
		title: "Fact reels",
		description: "AI-assisted drafts and published reel inventory.",
	},
] as const;

export default async function AdminHubPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user.isAdmin) {
		redirect("/" as Route);
	}

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-1">
				<h1 className="font-bold text-2xl tracking-tight">Overview</h1>
				<p className="max-w-2xl text-muted-foreground text-sm">
					Admin views for club resources — members, catalog, reading cycles,
					reviews, shelves, posts, comments, documents, and fact reels.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				{resources.map((resource) => (
					<Link key={resource.href} href={resource.href} className="block">
						<Card
							size="sm"
							className="h-full transition-colors hover:bg-muted/30"
						>
							<CardHeader>
								<CardTitle>{resource.title}</CardTitle>
								<CardDescription>{resource.description}</CardDescription>
							</CardHeader>
							<CardContent>
								<span className="text-foreground text-sm underline">
									Open →
								</span>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}
