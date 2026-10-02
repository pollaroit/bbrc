/** Top-level comment depth. Thread allows depths 0–4 (five levels). */
export const MAX_COMMENT_DEPTH = 4;

export function canReplyAtDepth(depth: number): boolean {
	return depth < MAX_COMMENT_DEPTH;
}
