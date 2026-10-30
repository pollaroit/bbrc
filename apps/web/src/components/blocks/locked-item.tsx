import { Lock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { FriendButton } from "@/components/blocks/friend-button";
import { UserAvatar } from "@/components/blocks/user-avatar";

const KIND_LABELS = {
	post: "post",
	review: "review",
	shelf: "shelf",
} as const;

type LockedItemProps = {
	kind: keyof typeof KIND_LABELS;
	author: { name: string; username: string; image: string | null };
};

/**
 * What someone sees at the address of something only the owner's friends can
 * open: who it belongs to (name, username and avatar are public) and a way to ask
 * to be friends. Never what is inside.
 */
export function LockedItem({ kind, author }: LockedItemProps) {
	const noun = KIND_LABELS[kind];
	return (
		<section
			aria-label={`Friends-only ${noun}`}
			className="mx-auto flex max-w-lg flex-col items-center gap-5 border border-border border-dashed px-6 py-14 text-center"
		>
			<Lock className="size-6 text-muted-foreground" aria-hidden />
			<div className="space-y-1.5">
				<h1 className="font-semibold text-xl tracking-tight">
					This {noun} is for friends only
				</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Only {author.name}'s friends can open it. Send a friend request to
					ask.
				</p>
			</div>
			<div className="flex w-full max-w-xs items-center gap-3 border border-border p-3 text-left">
				<Link
					href={`/users/${author.username}` as Route}
					className="flex min-w-0 flex-1 items-center gap-3"
				>
					<UserAvatar user={author} className="size-10" />
					<span className="min-w-0">
						<span className="block truncate font-medium text-sm">
							{author.name}
						</span>
						<span className="block truncate text-muted-foreground text-xs">
							@{author.username}
						</span>
					</span>
				</Link>
				<FriendButton username={author.username} />
			</div>
		</section>
	);
}
