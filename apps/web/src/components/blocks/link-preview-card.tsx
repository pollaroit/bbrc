"use client";

import type { LinkPreview } from "@bbrc/api/modules/link-preview/link-preview.schema";
import type { InternalLinkRef } from "@bbrc/shared";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import {
	ArrowUpRight,
	BookOpen,
	CalendarDays,
	FileText,
	Globe,
	Library,
	MessageCircle,
	PenLine,
	Star,
	UserRound,
} from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType } from "react";
import { ShelfCover } from "@/components/blocks/shelf-cover";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { bookCoverUrl } from "@/lib/book-cover";
import {
	describeExternalUrl,
	internalRefOf,
} from "@/lib/link-preview/site-path";
import { useLinkPreview } from "@/lib/link-preview/use-link-preview";
import { cn } from "@/lib/utils";

export type LinkCardVariant = "card" | "compact" | "hover";

const KIND_ICON: Record<
	LinkPreview["kind"],
	ComponentType<{ className?: string }>
> = {
	book: BookOpen,
	post: PenLine,
	comment_on_post: MessageCircle,
	comment_on_feedback: MessageCircle,
	feedback: Star,
	user: UserRound,
	shelf: Library,
	sitting: CalendarDays,
	author: PenLine,
};

/** A colour edge per kind makes cards easy to tell apart in a long thread. */
const KIND_EDGE: Record<LinkPreview["kind"], string> = {
	book: "border-s-info",
	post: "border-s-primary",
	comment_on_post: "border-s-muted-foreground",
	comment_on_feedback: "border-s-muted-foreground",
	feedback: "border-s-warning",
	user: "border-s-violet",
	shelf: "border-s-success",
	sitting: "border-s-pink",
	author: "border-s-violet",
};

const shellClass: Record<LinkCardVariant, string> = {
	card: "border border-border border-s-2 bg-card p-3 sm:p-4",
	compact: "border border-border border-s-2 bg-card p-2.5",
	hover: "p-3",
};

function Media({
	image,
	kind,
	variant,
}: {
	image: LinkPreview["image"];
	kind: LinkPreview["kind"];
	variant: LinkCardVariant;
}) {
	const small = variant === "compact";

	if (image?.type === "cover") {
		const src = bookCoverUrl(image.coverId, "M");
		return (
			<span
				className={cn(
					"relative block aspect-2/3 shrink-0 self-start overflow-hidden bg-muted ring-1 ring-foreground/10",
					small ? "w-9" : "w-14",
				)}
			>
				{src ? (
					<Image
						src={src}
						alt=""
						fill
						className="object-cover"
						sizes={small ? "36px" : "56px"}
					/>
				) : (
					<BookOpen className="absolute inset-0 m-auto size-4 text-muted-foreground" />
				)}
			</span>
		);
	}

	if (image?.type === "avatar") {
		return (
			<UserAvatar
				user={{ name: image.name, image: image.image }}
				className={cn("shrink-0 self-start", small ? "size-9" : "size-12")}
			/>
		);
	}

	if (image?.type === "mosaic") {
		return (
			<ShelfCover
				coverIds={image.coverIds}
				coverImageUrl={image.imageUrl}
				size="sm"
				className={cn("shrink-0 self-start", small && "size-11")}
			/>
		);
	}

	const Icon = KIND_ICON[kind];
	return (
		<span
			className={cn(
				"grid shrink-0 place-items-center self-start bg-muted text-muted-foreground",
				small ? "size-9" : "size-12",
			)}
		>
			<Icon className="size-5" />
		</span>
	);
}

function Body({
	preview,
	variant,
}: {
	preview: LinkPreview;
	variant: LinkCardVariant;
}) {
	const Icon = KIND_ICON[preview.kind];
	const compact = variant === "compact";
	return (
		<span className="flex min-w-0 flex-1 flex-col gap-1">
			<span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
				<Icon className="size-3" />
				{preview.kindLabel}
			</span>
			<span
				className={cn(
					"font-heading font-semibold leading-snug",
					compact ? "line-clamp-1 text-sm" : "line-clamp-2 text-sm",
				)}
			>
				{preview.title}
			</span>
			{preview.subtitle ? (
				<span className="line-clamp-1 text-muted-foreground text-xs">
					{preview.subtitle}
				</span>
			) : null}
			{preview.excerpt && !compact ? (
				<span className="line-clamp-2 text-foreground/80 text-xs leading-relaxed">
					{preview.excerpt}
				</span>
			) : null}
			{preview.meta.length > 0 && !compact ? (
				<span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-muted-foreground">
					{preview.meta.map((item, index) => (
						<span key={item} className="flex items-center gap-2">
							{index > 0 ? <span aria-hidden>·</span> : null}
							{item}
						</span>
					))}
				</span>
			) : null}
		</span>
	);
}

type LinkPreviewCardProps = {
	href: string;
	/** What the href points at, when already known. */
	internal?: InternalLinkRef | null;
	/** The link's own text, shown if the preview cannot load. */
	label?: string;
	variant?: LinkCardVariant;
	/** Fetch the preview only when true (hover cards wait until opened). */
	enabled?: boolean;
	/** Render as a plain box instead of a link (inside the editor). */
	asStatic?: boolean;
	className?: string;
};

/** A small, scannable preview of something on the site: what it is, who made it, how it is doing. */
export function LinkPreviewCard({
	href,
	internal,
	label,
	variant = "card",
	enabled = true,
	asStatic = false,
	className,
}: LinkPreviewCardProps) {
	const ref = internalRefOf(href, internal);
	const query = useLinkPreview(ref, { enabled });
	const preview = query.data;
	const shell = shellClass[variant];

	if (!ref) {
		return (
			<ExternalLinkCard
				href={href}
				label={label}
				variant={variant}
				asStatic={asStatic}
				className={className}
			/>
		);
	}

	if (!preview) {
		if (query.isError) {
			return (
				<ExternalLinkCard
					href={href}
					label={label}
					variant={variant}
					asStatic={asStatic}
					className={className}
					sameSite
				/>
			);
		}
		return (
			<div
				className={cn("flex gap-3", shell, "border-s-border", className)}
				aria-busy="true"
			>
				<Skeleton className="size-12 shrink-0" />
				<div className="flex flex-1 flex-col gap-2">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-3 w-1/2" />
				</div>
			</div>
		);
	}

	if (preview.status === "unavailable") {
		return (
			<div
				className={cn(
					"flex items-center gap-3 border border-border border-dashed text-muted-foreground",
					variant === "hover" ? "p-3" : "p-3",
					className,
				)}
			>
				<FileText className="size-5 shrink-0" aria-hidden />
				<span className="flex flex-col text-xs">
					<span className="font-medium text-foreground">{preview.title}</span>
					<span>{preview.subtitle}</span>
				</span>
			</div>
		);
	}

	const content = (
		<>
			<Media image={preview.image} kind={preview.kind} variant={variant} />
			<Body preview={preview} variant={variant} />
			{variant !== "hover" && !asStatic ? (
				<ArrowUpRight
					className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
					aria-hidden
				/>
			) : null}
		</>
	);
	const classes = cn(
		"group flex gap-3 text-start",
		shell,
		KIND_EDGE[preview.kind],
		!asStatic &&
			"transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
		className,
	);

	if (asStatic) {
		return <div className={classes}>{content}</div>;
	}

	return (
		<Link
			href={preview.href as Route}
			className={classes}
			onClick={(event) => event.stopPropagation()}
		>
			{content}
		</Link>
	);
}

type ExternalLinkCardProps = {
	href: string;
	label?: string;
	variant?: LinkCardVariant;
	asStatic?: boolean;
	/** The link is to this site but its preview could not be loaded. */
	sameSite?: boolean;
	className?: string;
};

/** An outside link: where it goes, with no data fetched from that site. */
export function ExternalLinkCard({
	href,
	label,
	variant = "card",
	asStatic = false,
	sameSite = false,
	className,
}: ExternalLinkCardProps) {
	const { host, path } = sameSite
		? { host: href, path: "" }
		: describeExternalUrl(href);
	const title = label && label !== href ? label : host;
	const small = variant === "compact";

	const content = (
		<>
			<span
				className={cn(
					"grid shrink-0 place-items-center self-start bg-muted text-muted-foreground",
					small ? "size-9" : "size-12",
				)}
			>
				<Globe className="size-5" aria-hidden />
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="line-clamp-2 font-heading font-semibold text-sm leading-snug">
					{title}
				</span>
				<span className="truncate text-muted-foreground text-xs">
					{sameSite ? href : `${host}${path}`}
				</span>
				{variant === "hover" ? (
					<span className="text-2xs text-muted-foreground">
						Opens another website in a new tab.
					</span>
				) : null}
			</span>
			{variant !== "hover" && !asStatic ? (
				<ArrowUpRight
					className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
					aria-hidden
				/>
			) : null}
		</>
	);

	const classes = cn(
		"group flex gap-3 text-start",
		shellClass[variant],
		"border-s-border",
		!asStatic &&
			"transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
		className,
	);

	if (asStatic) {
		return <div className={classes}>{content}</div>;
	}

	if (sameSite) {
		return (
			<Link
				href={href as Route}
				className={classes}
				onClick={(event) => event.stopPropagation()}
			>
				{content}
			</Link>
		);
	}

	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={classes}
			onClick={(event) => event.stopPropagation()}
		>
			{content}
		</a>
	);
}
