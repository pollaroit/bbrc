"use client";

import { Button } from "@bbrc/ui/components/button";

type QuizPagerProps = {
	page: number;
	totalPages: number;
	total: number;
	onPageChange: (page: number) => void;
};

export function QuizPager({
	page,
	totalPages,
	total,
	onPageChange,
}: QuizPagerProps) {
	if (totalPages <= 1) {
		return null;
	}

	return (
		<div className="flex items-center justify-between gap-3 text-sm">
			<span className="text-muted-foreground tabular-nums">
				Page {page} of {totalPages} · {total} total
			</span>
			<div className="flex gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={page <= 1}
					onClick={() => onPageChange(page - 1)}
				>
					Previous
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={page >= totalPages}
					onClick={() => onPageChange(page + 1)}
				>
					Next
				</Button>
			</div>
		</div>
	);
}
