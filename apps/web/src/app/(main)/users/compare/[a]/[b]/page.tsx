import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CompareView } from "@/components/blocks/user-compare/compare-view";
import { buildPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";
import { auth } from "@/services";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/users/compare/[a]/[b]">): Promise<Metadata> {
	const { a, b } = await params;
	return buildPageMetadata({
		title: `${a} and ${b}`,
		description: "Compare the reading of two members.",
		path: `/users/compare/${a}/${b}`,
		robots: NO_INDEX_ROBOTS,
	});
}

export default async function UserComparePage({
	params,
}: PageProps<"/users/compare/[a]/[b]">) {
	const { a: rawA, b: rawB } = await params;
	const a = decodeURIComponent(rawA);
	const b = decodeURIComponent(rawB);

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user) {
		redirect("/sign-in" as Route);
	}

	if (a === b) {
		return (
			<div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
				<h1 className="font-semibold text-xl tracking-tight">
					Pick two different members
				</h1>
				<p className="text-muted-foreground text-sm">
					A comparison needs two people. Open a member's profile and choose
					Compare.
				</p>
				<Link
					href={"/users" as Route}
					className="text-sm underline underline-offset-4"
				>
					Browse members
				</Link>
			</div>
		);
	}

	// A member always compares themselves with someone: put them on the left.
	if (!session.user.isAdmin) {
		const me = session.user.username;
		if (me !== a) {
			const other = me === b ? a : b;
			redirect(`/users/compare/${me}/${other}` as Route);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<h1 className="sr-only">
				Reading comparison of {a} and {b}
			</h1>
			<CompareView a={a} b={b} />
		</div>
	);
}
