import { AuthorTabSkeleton } from "@/components/blocks/author/author-tab-shell";

export default function AuthorCommentsLoading() {
	return <AuthorTabSkeleton variant="rows" count={4} />;
}
