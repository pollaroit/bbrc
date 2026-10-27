import { AuthorTabSkeleton } from "@/components/blocks/author/author-tab-shell";

export default function AuthorPostsLoading() {
	return <AuthorTabSkeleton variant="list" count={3} />;
}
