"use client";

import type { PostAttachmentInput } from "@bbrc/api/modules/post/post-attachment.schema";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { PostAttachmentCard } from "@/components/blocks/post-attachment-card";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type PostAttachmentComposePreviewProps = {
	input: PostAttachmentInput;
	className?: string;
};

export function PostAttachmentComposePreview({
	input,
	className,
}: PostAttachmentComposePreviewProps) {
	const previewQuery = useQuery({
		...orpc.post.previewAttachment.queryOptions({ input }),
	});

	if (previewQuery.isPending) {
		return <Skeleton className={cn("h-16 w-full", className)} />;
	}

	if (previewQuery.isError || !previewQuery.data) {
		return (
			<p className={cn("text-destructive text-xs", className)}>
				Could not load attachment preview.
			</p>
		);
	}

	return (
		<PostAttachmentCard
			attachment={previewQuery.data}
			className={cn("w-full", className)}
		/>
	);
}
