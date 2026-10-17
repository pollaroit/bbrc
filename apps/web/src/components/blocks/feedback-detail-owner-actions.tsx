"use client";

import { FeedbackEditIconButton } from "@/components/blocks/feedback-edit-icon-button";
import { authClient } from "@/lib/auth-client";

type FeedbackDetailOwnerActionsProps = {
	bookSlug: string;
	authorUsername: string;
	rating: number;
	review: string;
	isSpoiler: boolean;
};

export function FeedbackDetailOwnerActions({
	bookSlug,
	authorUsername,
	rating,
	review,
	isSpoiler,
}: FeedbackDetailOwnerActionsProps) {
	const { data: session } = authClient.useSession();

	if (!session?.user || session.user.username !== authorUsername) {
		return null;
	}

	return (
		<FeedbackEditIconButton
			bookSlug={bookSlug}
			rating={rating}
			review={review}
			isSpoiler={isSpoiler}
		/>
	);
}
