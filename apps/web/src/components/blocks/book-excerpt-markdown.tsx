import type { Components } from "react-markdown";
import Markdown from "react-markdown";

/** `reading` is the About page's roomier setting; `compact` suits cards and the overview. */
type ExcerptVariant = "compact" | "reading";

const TEXT: Record<ExcerptVariant, string> = {
	compact: "text-muted-foreground text-sm leading-relaxed",
	reading: "text-base text-foreground/85 leading-7",
};

const excerptMarkdownComponents = (variant: ExcerptVariant): Components => ({
	p: ({ children }) => <p className={TEXT[variant]}>{children}</p>,
	h1: ({ children }) => (
		<h3 className="font-semibold text-base text-foreground">{children}</h3>
	),
	h2: ({ children }) => (
		<h3 className="font-semibold text-base text-foreground">{children}</h3>
	),
	h3: ({ children }) => (
		<h3 className="font-semibold text-base text-foreground">{children}</h3>
	),
	h4: ({ children }) => (
		<h4 className="font-medium text-foreground text-sm">{children}</h4>
	),
	h5: ({ children }) => (
		<h4 className="font-medium text-foreground text-sm">{children}</h4>
	),
	h6: ({ children }) => (
		<h4 className="font-medium text-foreground text-sm">{children}</h4>
	),
	ul: ({ children }) => (
		<ul className={`flex list-disc flex-col gap-1.5 pl-5 ${TEXT[variant]}`}>
			{children}
		</ul>
	),
	ol: ({ children }) => (
		<ol className={`flex list-decimal flex-col gap-1.5 pl-5 ${TEXT[variant]}`}>
			{children}
		</ol>
	),
	li: ({ children }) => <li>{children}</li>,
	strong: ({ children }) => (
		<strong className="font-semibold text-foreground">{children}</strong>
	),
	em: ({ children }) => <em className="italic">{children}</em>,
	blockquote: ({ children }) => (
		<blockquote
			className={`border-border border-l-2 pl-4 italic ${TEXT[variant]}`}
		>
			{children}
		</blockquote>
	),
	a: ({ href, children }) => (
		<a
			href={href}
			className="text-primary underline-offset-4 hover:underline"
			target="_blank"
			rel="noopener noreferrer"
		>
			{children}
		</a>
	),
});

type BookExcerptMarkdownProps = {
	excerpt: string;
	className?: string;
	variant?: ExcerptVariant;
};

/** Renders Open Library–style markdown stored on book excerpts. */
export function BookExcerptMarkdown({
	excerpt,
	className,
	variant = "compact",
}: BookExcerptMarkdownProps) {
	return (
		<div className={className ?? "flex max-w-[68ch] flex-col gap-3"}>
			<Markdown components={excerptMarkdownComponents(variant)}>
				{excerpt}
			</Markdown>
		</div>
	);
}
