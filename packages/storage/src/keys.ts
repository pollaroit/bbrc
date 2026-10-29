import type { DocumentFileExtension } from "./constants";
import type { StorageEnv } from "./env";

export type ObjectKeyParams =
	| { kind: "avatar"; username: string }
	| { kind: "post-image"; postSlug: string }
	| { kind: "comment-image"; commentSlug: string }
	| { kind: "feedback-image"; feedbackSlug: string }
	| {
			kind: "shelf-cover";
			username: string;
			shelfSlug: string;
	  }
	| { kind: "book-cover"; coverUid: string }
	| { kind: "link-preview"; urlHash: string }
	| { kind: "edition-cover"; coverUid: string }
	| { kind: "author-photo"; photoUid: string }
	| { kind: "tierlist-image"; imageUid: string }
	| {
			kind: "book-document";
			bookSlug: string;
			documentSlug: string;
			extension: DocumentFileExtension;
	  };

export function buildObjectKey(
	storageEnv: StorageEnv,
	params: ObjectKeyParams,
): string {
	switch (params.kind) {
		case "avatar":
			return `${storageEnv}/users/${params.username}/avatar.jpg`;
		case "post-image":
			return `${storageEnv}/posts/${params.postSlug}/image.png`;
		case "comment-image":
			return `${storageEnv}/comments/${params.commentSlug}/image.png`;
		case "feedback-image":
			return `${storageEnv}/feedbacks/${params.feedbackSlug}/image.png`;
		case "shelf-cover":
			return `${storageEnv}/users/${params.username}/shelves/${params.shelfSlug}/image.png`;
		case "link-preview":
			return `${storageEnv}/link-previews/${params.urlHash}.webp`;
		case "book-cover":
			return `${storageEnv}/books/covers/${params.coverUid}.webp`;
		case "edition-cover":
			return `${storageEnv}/books/editions/${params.coverUid}.webp`;
		case "author-photo":
			return `${storageEnv}/authors/${params.photoUid}.webp`;
		case "tierlist-image":
			return `${storageEnv}/tierlists/${params.imageUid}.webp`;
		case "book-document":
			return `${storageEnv}/books/${params.bookSlug}/documents/${params.documentSlug}.${params.extension}`;
		default: {
			const _exhaustive: never = params;
			return _exhaustive;
		}
	}
}
