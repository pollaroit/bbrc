import type {
	GlobalSearchHit,
	GlobalSearchHitType,
} from "@bbrc/api/modules/search/global-search.schema";
import {
	BookOpen,
	BookOpenText,
	FileText,
	FileType2,
	Layers,
	Library,
	MessageSquare,
	PenLine,
	Star,
	Target,
	User,
} from "lucide-react";
import Image from "next/image";
import type { ComponentType } from "react";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { bookCoverUrl } from "@/lib/book-cover";
import { cn } from "@/lib/utils";

export const globalSearchTypeIcons: Record<
	GlobalSearchHitType,
	ComponentType<{ className?: string }>
> = {
	book: BookOpen,
	user: User,
	post: PenLine,
	feedback: Star,
	comment: MessageSquare,
	shelf: Library,
	document: FileText,
	author: BookOpen,
	goal: Target,
	series: Layers,
};

const documentIcons = {
	pdf: FileText,
	epub: BookOpenText,
	docx: FileType2,
} as const;

const documentTints = {
	pdf: "text-destructive-ink",
	epub: "text-success-ink",
	docx: "text-info-ink",
} as const;

const frameClassName =
	"relative flex size-9 shrink-0 items-center justify-center overflow-hidden border border-border bg-muted/35 text-muted-foreground";

/** Square thumbnail for a search result: a picture when it has one, else its type icon. */
export function GlobalSearchThumb({ hit }: { hit: GlobalSearchHit }) {
	const media = hit.media;
	const Icon = globalSearchTypeIcons[hit.type];

	if (media?.kind === "cover") {
		const src = bookCoverUrl(media.coverId, "S");
		if (src) {
			return (
				<div className={frameClassName} aria-hidden>
					<Image src={src} alt="" fill sizes="36px" className="object-cover" />
				</div>
			);
		}
	}

	if (media?.kind === "avatar") {
		return (
			<UserAvatar
				user={{ name: media.name, image: media.url }}
				className="size-9 shrink-0 border border-border"
			/>
		);
	}

	if (media?.kind === "collage") {
		return (
			<div
				className={cn(frameClassName, "grid grid-cols-2 gap-px")}
				aria-hidden
			>
				{Array.from({ length: 4 }, (_, index) => {
					const coverId = media.coverIds[index];
					const src = coverId == null ? null : bookCoverUrl(coverId, "S");
					return (
						<span key={index} className="relative block bg-muted">
							{src ? (
								<Image
									src={src}
									alt=""
									fill
									sizes="18px"
									className="object-cover"
								/>
							) : null}
						</span>
					);
				})}
			</div>
		);
	}

	if (media?.kind === "image") {
		return (
			<div className={frameClassName} aria-hidden>
				<Image
					src={media.url}
					alt=""
					fill
					sizes="36px"
					className="object-cover"
				/>
			</div>
		);
	}

	if (media?.kind === "document") {
		const format = media.format;
		const DocumentIcon = format ? documentIcons[format] : FileText;
		return (
			<div
				className={cn(
					frameClassName,
					"flex-col gap-0.5",
					format ? documentTints[format] : null,
				)}
				aria-hidden
			>
				<DocumentIcon className="size-4" />
				{format ? (
					<span className="font-semibold text-4xs uppercase leading-none">
						{format}
					</span>
				) : null}
			</div>
		);
	}

	return (
		<div className={frameClassName} aria-hidden>
			<Icon className="size-4" />
		</div>
	);
}
