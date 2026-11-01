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
		/** A picture to start the post with (it replaces an attachment: a post takes one or the other). */
		initialImage?: File | null,
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
	const [initialImage, setInitialImage] = useState<File | null>(null);

	const openCompose = useCallback(
		(
			attachment: PostAttachmentInput | null = null,
			content: string | null = null,
			image: File | null = null,
		) => {
			setInitialAttachment(image ? null : attachment);
			setInitialContent(content);
			setInitialImage(image);
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
				initialImage={initialImage}
				onClosed={() => {
					setInitialAttachment(null);
					setInitialContent(null);
					setInitialImage(null);
				}}
			/>
		</ComposePostContext>
	);
}
