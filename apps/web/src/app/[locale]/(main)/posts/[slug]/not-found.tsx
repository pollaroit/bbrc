import type { Route } from "next";
import { Link } from "@/i18n/navigation";

export default function PostNotFound() {
	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-8">
			<h1 className="font-bold text-2xl tracking-tight">Post not found</h1>
			<p className="text-muted-foreground text-sm">
				This post may have been deleted or the link is wrong.
			</p>
			<Link
				href={"/" as Route}
				className="text-foreground text-sm underline underline-offset-4"
			>
				Back to feed
			</Link>
		</div>
	);
}
