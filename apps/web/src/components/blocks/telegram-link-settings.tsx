"use client";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@bbrc/ui/components/alert-dialog";
import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export function TelegramLinkSettings() {
	const [unlinkOpen, setUnlinkOpen] = useState(false);
	const [awaitingBot, setAwaitingBot] = useState(false);
	const queryClient = useQueryClient();

	const linkStatus = useQuery({
		...orpc.user.getTelegramLinkStatus.queryOptions(),
		refetchInterval: awaitingBot ? 2000 : false,
	});

	const beginLink = useMutation(
		orpc.user.beginTelegramLink.mutationOptions({
			onSuccess: (data) => {
				setAwaitingBot(true);
				window.open(data.url, "_blank", "noopener,noreferrer");
			},
			onError: (error) => {
				toast.error(error.message);
			},
		}),
	);

	const unlinkMutation = useMutation(
		orpc.user.unlinkTelegram.mutationOptions({
			onSuccess: async () => {
				toast.success("Telegram disconnected");
				setUnlinkOpen(false);
				setAwaitingBot(false);
				await queryClient.invalidateQueries({
					queryKey: orpc.user.getTelegramLinkStatus.key(),
				});
				void authClient.getSession();
			},
			onError: (error) => {
				toast.error(error.message);
			},
		}),
	);

	useEffect(() => {
		if (!awaitingBot || !linkStatus.data?.linked) {
			return;
		}
		setAwaitingBot(false);
		void authClient.getSession();
		toast.success("Telegram connected");
	}, [awaitingBot, linkStatus.data?.linked]);

	const linked = linkStatus.data?.linked ?? false;
	const username = linkStatus.data?.telegramUsername;

	return (
		<section
			className="border border-border px-4 py-5"
			aria-labelledby="telegram-link-heading"
		>
			<h2 id="telegram-link-heading" className="font-medium text-base">
				Telegram
			</h2>
			<p className="mt-2 text-muted-foreground text-sm leading-relaxed">
				Connect the same Telegram account you use in the club group so BBRC can
				match you to bot commands and reading polls later.
			</p>

			{linkStatus.isPending ? (
				<p className="mt-4 text-muted-foreground text-sm">Loading…</p>
			) : null}

			{linkStatus.data && linked ? (
				<div className="mt-4 flex flex-col gap-3">
					<p className="text-sm">
						Connected as{" "}
						<span className="font-medium">
							{username ? `@${username}` : "Telegram user"}
						</span>
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-fit"
						onClick={() => setUnlinkOpen(true)}
					>
						Disconnect Telegram
					</Button>
				</div>
			) : null}

			{linkStatus.data && !linked ? (
				<div className="mt-4 flex flex-col gap-3">
					<LoadingButton
						type="button"
						loading={beginLink.isPending}
						className="w-fit"
						onClick={() => beginLink.mutate(undefined)}
					>
						Connect Telegram
					</LoadingButton>
					{awaitingBot ? (
						<p className="text-muted-foreground text-sm">
							Tap <strong className="font-medium text-foreground">Start</strong>{" "}
							in the bot chat if Telegram asks. This page updates when the link
							is complete.
						</p>
					) : (
						<p className="text-muted-foreground text-xs">
							Opens a private chat with the club bot — no website login popup.
						</p>
					)}
				</div>
			) : null}

			<AlertDialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
				<AlertDialogContent>
					<AlertDialogHeader className="text-left sm:place-items-start sm:text-left">
						<AlertDialogTitle>Disconnect Telegram?</AlertDialogTitle>
						<AlertDialogDescription>
							Bot features that rely on your Telegram identity will stop working
							until you connect again.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={unlinkMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<LoadingButton
							type="button"
							variant="destructive"
							loading={unlinkMutation.isPending}
							onClick={() => unlinkMutation.mutate(undefined)}
						>
							Disconnect
						</LoadingButton>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</section>
	);
}
