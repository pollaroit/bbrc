import { AuthorTabSkeleton } from "@/components/blocks/author/author-tab-shell";

export default function AuthorReviewsLoading() {
	return <AuthorTabSkeleton variant="grid" count={4} />;
}
