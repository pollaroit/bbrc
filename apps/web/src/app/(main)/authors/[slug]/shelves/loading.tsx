import { AuthorTabSkeleton } from "@/components/blocks/author/author-tab-shell";

export default function AuthorShelvesLoading() {
	return <AuthorTabSkeleton variant="grid" count={3} />;
}
