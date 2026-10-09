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
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ENV } from "@/env";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

type TelegramWidgetUser = {
	id: number;
	first_name: string;
	last_name?: string;
	username?: string;
	photo_url?: string;
	auth_date: number;
	hash: string;
};

declare global {
	interface Window {
		onTelegramLinkAuth?: (user: TelegramWidgetUser) => void;
	}
}

export function TelegramLinkSettings() {
	const widgetHostRef = useRef<HTMLDivElement>(null);
	const [unlinkOpen, setUnlinkOpen] = useState(false);
	const queryClient = useQueryClient();
	const botUsername = ENV.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");

	const linkStatus = useQuery(orpc.user.getTelegramLinkStatus.queryOptions());

	const linkMutation = useMutation(
		orpc.user.linkTelegram.mutationOptions({
			onSuccess: async () => {
				toast.success("Telegram connected");
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

	const unlinkMutation = useMutation(
		orpc.user.unlinkTelegram.mutationOptions({
			onSuccess: async () => {
				toast.success("Telegram disconnected");
				setUnlinkOpen(false);
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

	const linkMutateRef = useRef(linkMutation.mutate);
	linkMutateRef.current = linkMutation.mutate;

	useEffect(() => {
		if (linkStatus.data?.linked || !botUsername) {
			return;
		}

		const host = widgetHostRef.current;
		if (!host) {
			return;
		}

		host.replaceChildren();

		window.onTelegramLinkAuth = (user) => {
			linkMutateRef.current(user);
		};

		const script = document.createElement("script");
		script.src = "https://telegram.org/js/telegram-widget.js?22";
		script.async = true;
		script.setAttribute("data-telegram-login", botUsername);
		script.setAttribute("data-size", "large");
		script.setAttribute("data-onauth", "onTelegramLinkAuth(user)");
		script.setAttribute("data-request-access", "write");
		host.appendChild(script);

		return () => {
			host.replaceChildren();
			delete window.onTelegramLinkAuth;
		};
	}, [linkStatus.data?.linked, botUsername]);

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

			{!botUsername ? (
				<p className="mt-4 text-destructive text-sm">
					Telegram login is not configured on this site yet (
					<code className="text-xs">TELEGRAM_BOT_USERNAME</code>).
				</p>
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

			{linkStatus.data && !linked && botUsername ? (
				<div className="mt-4 flex flex-col gap-3">
					<div ref={widgetHostRef} className="min-h-10" />
					{linkMutation.isPending ? (
						<p className="text-muted-foreground text-sm">Connecting…</p>
					) : null}
					<p className="text-muted-foreground text-xs">
						Use the button above to sign in with Telegram. BBRC will not replace
						your email login — this only links identities.
					</p>
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
