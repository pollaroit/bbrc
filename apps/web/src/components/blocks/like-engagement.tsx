"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SignInLink, useSignInHref } from "@/components/blocks/sign-in-link";
import { authClient } from "@/lib/auth-client";
import { useSyncedBoolean } from "@/lib/optimistic/use-synced-boolean";
import {
	type LikeKind,
	setViewerLike,
	useViewerLike,
} from "@/lib/optimistic/viewer-likes";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

type LikeHeartProps = {
	liked: boolean;
	size?: "sm" | "md";
	onClick: () => void;
	label: string;
};

/** Pink heart that pops (with a soft ring) when it becomes liked. */
export function LikeHeartButton({
	liked,
	size = "md",
	onClick,
	label,
}: LikeHeartProps) {
	const isSmall = size === "sm";
	const [popKey, setPopKey] = useState(0);
	const previous = useRef(liked);

	useEffect(() => {
		if (liked && !previous.current) {
			setPopKey((key) => key + 1);
		}
		previous.current = liked;
	}, [liked]);

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			className={cn(
				"relative text-muted-foreground hover:bg-transparent hover:text-foreground aria-expanded:bg-transparent dark:hover:bg-transparent",
				isSmall && "size-7",
				liked && "text-pink hover:text-pink",
			)}
			onClick={onClick}
			aria-label={label}
			aria-pressed={liked}
		>
			{popKey > 0 && liked ? (
				<span
					key={`ring-${popKey}`}
					aria-hidden
					className="pointer-events-none absolute inset-0 m-auto size-5 animate-like-ring rounded-full border-2 border-pink/80 motion-reduce:hidden"
				/>
			) : null}
			<Heart
				key={`heart-${popKey}`}
				className={cn(
					isSmall ? "size-3" : "size-4",
					"transition-colors",
					liked && "fill-current",
					liked && popKey > 0 && "animate-like-pop motion-reduce:animate-none",
				)}
				aria-hidden
			/>
		</Button>
	);
}

type LikeEngagementProps = {
	kind: LikeKind;
	slug: string;
	initialLikeCount: number;
	initialLikedByMe: boolean;
	/** "post", "comment" or "review", used in labels. */
	noun: string;
	size?: "sm" | "md";
	className?: string;
	/** Renders the likers list inside the dialog. */
	renderLikers: (enabled: boolean) => ReactNode;
};

export function LikeEngagement({
	kind,
	slug,
	initialLikeCount,
	initialLikedByMe,
	noun,
	size = "md",
	className,
	renderLikers,
}: LikeEngagementProps) {
	const { data: session } = authClient.useSession();
	const queryClient = useQueryClient();
	const signInHref = useSignInHref();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [base, setBase] = useState({
		liked: initialLikedByMe,
		count: initialLikeCount,
	});

	// Pre-rendered pages know nothing about the viewer; the batched lookup does.
	const viewerLiked = useViewerLike(kind, slug);
	const serverLiked = viewerLiked ?? base.liked;

	useEffect(() => {
		setBase({ liked: initialLikedByMe, count: initialLikeCount });
	}, [initialLikedByMe, initialLikeCount]);

	const sync = useSyncedBoolean({
		serverValue: serverLiked,
		send: (liked) =>
			client.like.set({ [`${kind}Slug`]: slug, liked } as {
				postSlug?: string;
				commentSlug?: string;
				feedbackSlug?: string;
				liked: boolean;
			}),
		confirmedFrom: (result) => result.liked,
		onConfirmed: (result) => {
			setBase({ liked: result.liked, count: result.likeCount });
			setViewerLike(kind, slug, result.liked);
			void queryClient.invalidateQueries({
				queryKey: orpc.like.getLikeList.key(),
			});
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Could not update your like.",
			);
		},
	});

	const likeCount = Math.max(
		0,
		base.count + (sync.value ? 1 : 0) - (serverLiked ? 1 : 0),
	);

	function handleToggle() {
		if (!session?.user) {
			toast.error(`Sign in to like ${noun}s.`, {
				action: {
					label: "Sign in",
					onClick: () => {
						window.location.href = signInHref;
					},
				},
			});
			return;
		}
		sync.toggle();
	}

	const isSmall = size === "sm";

	return (
		<>
			<div
				className={cn(
					"inline-flex items-center gap-0.5 text-muted-foreground",
					isSmall ? "text-xs" : "text-sm",
					className,
				)}
			>
				<LikeHeartButton
					liked={sync.value}
					size={size}
					onClick={handleToggle}
					label={sync.value ? `Unlike ${noun}` : `Like ${noun}`}
				/>
				<Button
					type="button"
					variant="link"
					className={cn(
						"h-auto px-1 py-0 text-inherit tabular-nums",
						isSmall && "text-xs",
					)}
					onClick={() => setDialogOpen(true)}
				>
					{likeCount}
				</Button>
			</div>

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="flex max-h-[min(90vh,560px)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
					<DialogHeader className="border-border border-b p-4">
						<DialogTitle>Likes</DialogTitle>
						<DialogDescription>
							{likeCount === 1
								? `1 member liked this ${noun}.`
								: `${likeCount} members liked this ${noun}.`}
						</DialogDescription>
					</DialogHeader>
					<div className="min-h-0 flex-1 overflow-y-auto p-4">
						{renderLikers(dialogOpen)}
					</div>
					{!session?.user ? (
						<p className="border-border border-t px-4 py-3 text-center text-muted-foreground text-sm">
							<SignInLink className="text-foreground underline">
								Sign in
							</SignInLink>{" "}
							to like this {noun}.
						</p>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}
