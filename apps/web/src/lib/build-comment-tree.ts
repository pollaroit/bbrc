import type { CommentListItem } from "@bbrc/api/modules/comment/comment.schema";

export type CommentTreeNode = CommentListItem & {
	children: CommentTreeNode[];
};

export function buildCommentTree(
	comments: CommentListItem[],
): CommentTreeNode[] {
	const nodes = new Map<string, CommentTreeNode>();

	for (const comment of comments) {
		nodes.set(comment.slug, { ...comment, children: [] });
	}

	const roots: CommentTreeNode[] = [];

	for (const comment of comments) {
		const node = nodes.get(comment.slug);
		if (!node) {
			continue;
		}

		if (comment.parentSlug) {
			const parent = nodes.get(comment.parentSlug);
			if (parent) {
				parent.children.push(node);
			} else {
				roots.push(node);
			}
		} else {
			roots.push(node);
		}
	}

	const sortByCreatedAt = (a: CommentTreeNode, b: CommentTreeNode) =>
		b.createdAt.getTime() - a.createdAt.getTime();

	const sortTree = (branch: CommentTreeNode[]) => {
		branch.sort(sortByCreatedAt);
		for (const node of branch) {
			sortTree(node.children);
		}
	};

	sortTree(roots);

	return roots;
}

/** Find a comment (and its nested replies) within a flat list. */
export function extractCommentSubtree(
	comments: CommentListItem[],
	rootSlug: string,
): CommentTreeNode | null {
	const roots = buildCommentTree(comments);

	const walk = (node: CommentTreeNode): CommentTreeNode | null => {
		if (node.slug === rootSlug) {
			return node;
		}
		for (const child of node.children) {
			const match = walk(child);
			if (match) {
				return match;
			}
		}
		return null;
	};

	for (const root of roots) {
		const match = walk(root);
		if (match) {
			return match;
		}
	}

	return null;
}

/** All nested replies under this node (not including the node itself). */
export function countDescendants(node: CommentTreeNode): number {
	let total = 0;
	for (const child of node.children) {
		total += 1 + countDescendants(child);
	}
	return total;
}

export function treeContainsSlug(
	node: CommentTreeNode,
	slug: string | null,
): boolean {
	if (!slug) {
		return false;
	}
	if (node.slug === slug) {
		return true;
	}
	return node.children.some((child) => treeContainsSlug(child, slug));
}
