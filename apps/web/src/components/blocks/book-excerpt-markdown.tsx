import type { Components } from "react-markdown";
import Markdown from "react-markdown";

const excerptMarkdownComponents: Components = {
	p: ({ children }) => (
		<p className="text-muted-foreground text-sm leading-relaxed">{children}</p>
	),
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
		<ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted-foreground text-sm leading-relaxed">
			{children}
		</ul>
	),
	ol: ({ children }) => (
		<ol className="flex list-decimal flex-col gap-1.5 pl-5 text-muted-foreground text-sm leading-relaxed">
			{children}
		</ol>
	),
	li: ({ children }) => <li>{children}</li>,
	strong: ({ children }) => (
		<strong className="font-semibold text-foreground">{children}</strong>
	),
	em: ({ children }) => <em className="italic">{children}</em>,
	blockquote: ({ children }) => (
		<blockquote className="border-border border-l-2 pl-4 text-muted-foreground text-sm italic leading-relaxed">
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
};

type BookExcerptMarkdownProps = {
	excerpt: string;
	className?: string;
};

/** Renders Open Library–style markdown stored on book excerpts. */
export function BookExcerptMarkdown({
	excerpt,
	className,
}: BookExcerptMarkdownProps) {
	return (
		<div className={className ?? "flex max-w-3xl flex-col gap-3"}>
			<Markdown components={excerptMarkdownComponents}>{excerpt}</Markdown>
		</div>
	);
}
