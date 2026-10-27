"use client";

import { Button } from "@bbrc/ui/components/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";
import { client, orpc, queryClient } from "@/utils/orpc";

export type AuthorFollowState = { following: boolean; followerCount: number };

type FollowAuthorButtonProps = {
	slug: string;
	/** Counts known when the page was built, shown until the live state arrives. */
	initial?: AuthorFollowState;
	size?: "sm" | "default";
	/** Show the number of followers next to the label (a count, never names). */
	showCount?: boolean;
	className?: string;
};

/**
 * Follow state of one author with an optimistic toggle. The same hook backs the button,
 * so a count shown elsewhere on the page can read it without a second request.
 */
export function useAuthorFollow(slug: string, initial?: AuthorFollowState) {
	const t = useTranslations("authors");
	const { data: session } = authClient.useSession();
	const input = { target: { type: "author" as const, slug } };
	const options = orpc.follow.state.queryOptions({ input });

	const stateQuery = useQuery({
		...options,
		// Placeholder only: the page is cached for everyone, so the real state is always fetched.
		...(initial ? { placeholderData: initial } : {}),
		staleTime: 60_000,
	});

	const mutation = useMutation({
		mutationFn: () => client.follow.toggle(input),
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: options.queryKey });
			const previous = queryClient.getQueryData<AuthorFollowState>(
				options.queryKey,
			);
			const base = previous ??
				initial ?? { following: false, followerCount: 0 };
			queryClient.setQueryData<AuthorFollowState>(options.queryKey, {
				following: !base.following,
				followerCount: Math.max(
					0,
					base.followerCount + (base.following ? -1 : 1),
				),
			});
			return { previous: base };
		},
		onError: (_error, _vars, context) => {
			if (context) {
				queryClient.setQueryData(options.queryKey, context.previous);
			}
			toast.error(t("follow.failed"));
		},
		onSuccess: (data) => {
			queryClient.setQueryData<AuthorFollowState>(options.queryKey, {
				following: data.following,
				followerCount: data.followerCount,
			});
			toast.success(
				data.following ? t("follow.nowFollowing") : t("follow.unfollowed"),
			);
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: orpc.follow.mine.key() });
			void queryClient.invalidateQueries({ queryKey: orpc.author.get.key() });
		},
	});

	const state = stateQuery.data ?? initial ?? null;

	return {
		following: state?.following ?? false,
		followerCount: state?.followerCount ?? 0,
		isReady: state != null,
		isSignedIn: Boolean(session?.user),
		isPending: mutation.isPending,
		toggle: () => {
			if (!session?.user) {
				toast.info(t("follow.signIn"));
				return;
			}
			mutation.mutate();
		},
	};
}

export function FollowAuthorButton({
	slug,
	initial,
	size = "default",
	showCount = true,
	className,
}: FollowAuthorButtonProps) {
	const f = useFormatters();
	const t = useTranslations("authors");
	const follow = useAuthorFollow(slug, initial);
	const Icon = follow.following ? BellRing : Bell;

	return (
		<Button
			type="button"
			size={size === "sm" ? "sm" : "default"}
			variant={follow.following ? "secondary" : "default"}
			aria-pressed={follow.following}
			disabled={follow.isPending}
			onClick={follow.toggle}
			className={cn("shrink-0", className)}
		>
			<Icon className="size-4" aria-hidden />
			{follow.following ? t("follow.following") : t("follow.follow")}
			{showCount && follow.isReady && follow.followerCount > 0 ? (
				<span className="text-muted-foreground tabular-nums">
					{f.compact(follow.followerCount)}
				</span>
			) : null}
		</Button>
	);
}
