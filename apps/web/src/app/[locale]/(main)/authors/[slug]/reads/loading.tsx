import { AuthorTabSkeleton } from "@/components/blocks/author/author-tab-shell";

export default function AuthorReadsLoading() {
	return <AuthorTabSkeleton variant="grid" count={6} />;
}
