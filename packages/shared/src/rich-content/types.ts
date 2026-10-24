export const RICH_CONTENT_VERSION = 1 as const;

export type TextMark = "bold" | "italic" | "underline";

export type InternalLinkRef =
	| { kind: "book"; slug: string }
	| { kind: "post"; slug: string }
	| { kind: "comment_on_post"; postSlug: string; slug: string }
	| {
			kind: "comment_on_feedback";
			bookSlug: string;
			feedbackSlug: string;
			slug: string;
	  }
	| { kind: "feedback"; bookSlug: string; slug: string }
	| { kind: "user"; username: string }
	| { kind: "shelf"; username: string; slug: string }
	| { kind: "sitting"; slug: string };

export type RichInline =
	| { t: "text"; s: string; m?: TextMark[] }
	| { t: "link"; href: string; label: string; internal?: InternalLinkRef }
	| { t: "mention"; username: string };

/** A link shown on its own as a preview card instead of inside a sentence. */
export type RichEmbedBlock = {
	t: "embed";
	href: string;
	label: string;
	internal?: InternalLinkRef;
};

export type RichTextBlock =
	| { t: "p"; inline: RichInline[] }
	| { t: "h"; inline: RichInline[] }
	| { t: "blockquote"; inline: RichInline[] };

export type RichBlock = RichTextBlock | RichEmbedBlock;

export type RichDocument = {
	v: typeof RICH_CONTENT_VERSION;
	blocks: RichBlock[];
};
