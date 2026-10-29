"use client";

import type { PostAttachmentInput } from "@bbrc/api/modules/post/post-attachment.schema";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { ComposePostDialog } from "@/components/blocks/compose-post-form";

type ComposePostContextValue = {
	openCompose: (
		initialAttachment?: PostAttachmentInput | null,
		initialContent?: string | null,
	) => void;
};

const ComposePostContext = createContext<ComposePostContextValue | null>(null);

export function useComposePost(): ComposePostContextValue {
	const value = useContext(ComposePostContext);
	if (!value) {
		throw new Error("useComposePost must be used within ComposePostProvider");
	}
	return value;
}

export function ComposePostProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [initialAttachment, setInitialAttachment] =
		useState<PostAttachmentInput | null>(null);
	const [initialContent, setInitialContent] = useState<string | null>(null);

	const openCompose = useCallback(
		(
			attachment: PostAttachmentInput | null = null,
			content: string | null = null,
		) => {
			setInitialAttachment(attachment);
			setInitialContent(content);
			setOpen(true);
		},
		[],
	);

	const value = useMemo(() => ({ openCompose }), [openCompose]);

	return (
		<ComposePostContext value={value}>
			{children}
			<ComposePostDialog
				open={open}
				onOpenChange={setOpen}
				initialAttachment={initialAttachment}
				initialContent={initialContent}
				onClosed={() => {
					setInitialAttachment(null);
					setInitialContent(null);
				}}
			/>
		</ComposePostContext>
	);
}
