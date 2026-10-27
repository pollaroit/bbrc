import type { Metadata } from "next";
import { UserQuizzesList } from "@/components/blocks/user-quizzes-list";
import { ListingSearchParamsBoundary } from "@/components/listing/listing-search-params-boundary";
import { loadUserByUsernameForPage } from "@/lib/member-profile-data";
import {
	buildNotFoundMetadata,
	buildPageMetadata,
	NO_INDEX_ROBOTS,
} from "@/lib/seo";

export async function generateMetadata({
	params,
}: PageProps<"/[locale]/users/[username]/quizzes">): Promise<Metadata> {
	const { username } = await params;

	try {
		const user = await loadUserByUsernameForPage(username);

		return buildPageMetadata({
			title: `${user.name} · Quizzes`,
			description: `Book quizzes ${user.name} has taken on BBRC.`,
			path: `/users/${user.username}/quizzes`,
			robots: user.indexable ? undefined : NO_INDEX_ROBOTS,
			openGraph: { type: "profile" },
		});
	} catch {
		return buildNotFoundMetadata("Member");
	}
}

export default async function UserQuizzesPage({
	params,
}: PageProps<"/[locale]/users/[username]/quizzes">) {
	const { username } = await params;

	return (
		<ListingSearchParamsBoundary>
			<UserQuizzesList username={username} />
		</ListingSearchParamsBoundary>
	);
}
