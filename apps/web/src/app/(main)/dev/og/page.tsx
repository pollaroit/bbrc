import { notFound } from "next/navigation";
import { STATIC_APP_ROUTES } from "@/lib/seo";
import { db } from "@/services";
import { OgDevPreview } from "./og-dev-preview";

export const dynamic = "force-dynamic";

export default async function OgDevPage() {
	if (process.env.NODE_ENV === "production") {
		notFound();
	}

	const [book, post, comment, feedback, sitting, user] = await Promise.all([
		db.book.findFirst({
			orderBy: { createdAt: "desc" },
			select: { slug: true },
		}),
		db.post.findFirst({
			orderBy: { createdAt: "desc" },
			select: { slug: true },
		}),
		db.comment.findFirst({
			orderBy: { createdAt: "desc" },
			select: { slug: true },
		}),
		db.feedback.findFirst({
			orderBy: { createdAt: "desc" },
			select: { slug: true },
		}),
		db.sitting.findFirst({
			orderBy: { createdAt: "desc" },
			select: { slug: true },
		}),
		db.user.findFirst({
			orderBy: { createdAt: "asc" },
			select: { username: true },
		}),
	]);

	const staticPaths = [
		...STATIC_APP_ROUTES.map(({ path }) => ({
			label: path === "/" ? "Home" : path.slice(1),
			path,
		})),
		{ label: "Settings", path: "/settings" },
		{ label: "Notifications", path: "/settings/notifications" },
		{ label: "Sign in", path: "/sign-in" },
		{ label: "Add book", path: "/books/new" },
		{ label: "Request book", path: "/books/request" },
		...(user?.username
			? [
					{
						label: "Member posts",
						path: `/users/${user.username}/posts`,
					},
					{
						label: "Member feedbacks",
						path: `/users/${user.username}/feedbacks`,
					},
				]
			: []),
	];

	return (
		<OgDevPreview
			staticPaths={staticPaths}
			samples={{
				bookSlug: book?.slug,
				postSlug: post?.slug,
				commentSlug: comment?.slug,
				feedbackSlug: feedback?.slug,
				sittingSlug: sitting?.slug,
				username: user?.username,
			}}
		/>
	);
}
