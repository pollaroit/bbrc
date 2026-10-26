import type { PollOption } from "@bbrc/api/modules/post-poll/post-poll.schema";
import { BookOpen, Globe, Library, UserRound } from "lucide-react";
import Image from "next/image";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import { countryFlag } from "@/lib/poll/format";
import { cn } from "@/lib/utils";

type PollOptionContentProps = {
	option: Pick<PollOption, "kind" | "label" | "target">;
	className?: string;
};

/** What an option looks like inside a row: its text, or the thing it points to. */
export function PollOptionContent({
	option,
	className,
}: PollOptionContentProps) {
	const { kind, label, target } = option;

	if (kind === "book") {
		const src = bookCoverUrl(target.coverId, "S");
		return (
			<span className={cn("flex min-w-0 items-center gap-3", className)}>
				<span className="relative block aspect-2/3 w-8 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
					{src ? (
						<Image
							src={src}
							alt=""
							fill
							className="object-cover"
							sizes="32px"
						/>
					) : (
						<BookOpen className="absolute inset-0 m-auto size-3.5 text-muted-foreground" />
					)}
				</span>
				<span className="flex min-w-0 flex-col">
					<span className="truncate font-medium text-sm leading-snug">
						{target.title ?? label}
					</span>
					{target.authors.length > 0 ? (
						<span className="truncate text-muted-foreground text-xs">
							{formatBookAuthors(target.authors)}
						</span>
					) : null}
				</span>
			</span>
		);
	}

	if (kind === "user") {
		const name = target.name ?? label;
		return (
			<span className={cn("flex min-w-0 items-center gap-3", className)}>
				{target.username ? (
					<UserAvatar user={{ name, image: target.image }} className="size-8" />
				) : (
					<span className="grid size-8 shrink-0 place-items-center bg-muted">
						<UserRound className="size-4 text-muted-foreground" />
					</span>
				)}
				<span className="flex min-w-0 flex-col">
					<span className="truncate font-medium text-sm leading-snug">
						{name}
					</span>
					{target.username ? (
						<span className="truncate text-muted-foreground text-xs">
							@{target.username}
						</span>
					) : null}
				</span>
			</span>
		);
	}

	if (kind === "country") {
		return (
			<span className={cn("flex min-w-0 items-center gap-3", className)}>
				<span className="grid size-8 shrink-0 place-items-center bg-muted text-lg leading-none">
					{countryFlag(target.code) || <Globe className="size-4" />}
				</span>
				<span className="truncate font-medium text-sm">{label}</span>
			</span>
		);
	}

	if (kind === "author" || kind === "series") {
		return (
			<span className={cn("flex min-w-0 items-center gap-3", className)}>
				<span className="relative grid size-8 shrink-0 place-items-center overflow-hidden bg-muted">
					{kind === "author" && target.image ? (
						<Image
							src={target.image}
							alt=""
							fill
							sizes="32px"
							className="object-cover"
						/>
					) : kind === "author" ? (
						<UserRound className="size-4 text-muted-foreground" />
					) : (
						<Library className="size-4 text-muted-foreground" />
					)}
				</span>
				<span className="flex min-w-0 flex-col">
					<span className="truncate font-medium text-sm leading-snug">
						{target.title ?? label}
					</span>
					<span className="text-muted-foreground text-xs capitalize">
						{kind}
					</span>
				</span>
			</span>
		);
	}

	return (
		<span className={cn("min-w-0 font-medium text-sm leading-snug", className)}>
			{label}
		</span>
	);
}
