"use client";

import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { headerToolbarIconButtonClass } from "@/lib/header-toolbar";
import { orpc, queryClient } from "@/utils/orpc";

function formatNotificationTime(value: Date | string): string {
	const date = value instanceof Date ? value : new Date(value);
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

export function NotificationBell() {
	const [open, setOpen] = useState(false);

	// Kept live (and polled as a fallback) by `PwaNotificationEngagement`.
	const unreadQuery = useQuery(orpc.notification.getUnreadCount.queryOptions());

	const listQuery = useQuery({
		...orpc.notification.getNotificationList.queryOptions({
			input: { limit: 20 },
		}),
		enabled: open,
	});

	const unreadKey = orpc.notification.getUnreadCount.queryKey();
	const listKey = orpc.notification.getNotificationList.key();

	/** Marks notifications read in the badge and the open list before the server answers. */
	async function markReadOptimistically(ids: "all" | string) {
		await Promise.all([
			queryClient.cancelQueries({ queryKey: unreadKey }),
			queryClient.cancelQueries({ queryKey: listKey }),
		]);
		const previousUnread = queryClient.getQueryData(unreadKey);
		const previousLists = queryClient.getQueriesData({ queryKey: listKey });
		const now = new Date();
		let newlyRead = 0;

		queryClient.setQueriesData(
			{ queryKey: listKey },
			(old: { items: { id: string; readAt: Date | null }[] } | undefined) => {
				if (!old?.items) {
					return old;
				}
				return {
					...old,
					items: old.items.map((item) => {
						if (item.readAt != null || (ids !== "all" && item.id !== ids)) {
							return item;
						}
						newlyRead += 1;
						return { ...item, readAt: now };
					}),
				};
			},
		);

		queryClient.setQueryData(unreadKey, (old) =>
			old
				? {
						...old,
						count:
							ids === "all"
								? 0
								: Math.max(0, old.count - Math.max(newlyRead, 1)),
					}
				: old,
		);

		return { previousUnread, previousLists };
	}

	function restoreNotifications(
		context: Awaited<ReturnType<typeof markReadOptimistically>> | undefined,
	) {
		if (!context) {
			return;
		}
		queryClient.setQueryData(unreadKey, context.previousUnread);
		for (const [key, data] of context.previousLists) {
			queryClient.setQueryData(key, data);
		}
	}

	function refreshNotifications() {
		void queryClient.invalidateQueries({ queryKey: unreadKey });
		void queryClient.invalidateQueries({ queryKey: listKey });
	}

	const markReadMutation = useMutation(
		orpc.notification.markRead.mutationOptions({
			onMutate: (variables) => markReadOptimistically(variables.id),
			onError: (error, _variables, context) => {
				restoreNotifications(context);
				toast.error(error.message);
			},
			onSettled: refreshNotifications,
		}),
	);

	const markAllMutation = useMutation(
		orpc.notification.markAllRead.mutationOptions({
			onMutate: () => markReadOptimistically("all"),
			onError: (error, _variables, context) => {
				restoreNotifications(context);
				toast.error(error.message);
			},
			onSettled: refreshNotifications,
		}),
	);

	const unreadCount = unreadQuery.data?.count ?? 0;
	const items = listQuery.data?.items ?? [];

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						className={`relative ${headerToolbarIconButtonClass}`}
						aria-label={
							unreadCount > 0
								? `Notifications, ${unreadCount} unread`
								: "Notifications"
						}
					/>
				}
			>
				<Bell className="size-5" aria-hidden />
				{unreadCount > 0 ? (
					<Badge
						variant="destructive"
						className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center p-0 text-3xs"
					>
						{unreadCount > 9 ? "9+" : unreadCount}
					</Badge>
				) : null}
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0 sm:w-96">
				<div className="flex items-center justify-between border-b px-4 py-3">
					<p className="font-semibold text-sm">Notifications</p>
					{unreadCount > 0 ? (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-auto px-2 py-1 text-xs"
							onClick={() => markAllMutation.mutate(undefined)}
						>
							Mark all read
						</Button>
					) : null}
				</div>
				<div className="max-h-80 overflow-y-auto">
					{listQuery.isPending ? (
						<p className="px-4 py-6 text-center text-muted-foreground text-sm">
							Loading…
						</p>
					) : items.length === 0 ? (
						<p className="px-4 py-6 text-center text-muted-foreground text-sm">
							No notifications yet.
						</p>
					) : (
						<ul>
							{items.map((item) => {
								const isUnread = item.readAt == null;
								const content = (
									<>
										<span className="block font-medium text-sm">
											{item.title}
										</span>
										<span className="mt-0.5 block text-muted-foreground text-sm">
											{item.body}
										</span>
										<span className="mt-1 block text-muted-foreground text-xs">
											{formatNotificationTime(item.createdAt)}
										</span>
									</>
								);

								return (
									<li
										key={item.id}
										className={isUnread ? "bg-muted/40" : "bg-background"}
									>
										{item.href ? (
											<Link
												href={item.href as Route}
												className="block px-4 py-3 transition-colors hover:bg-muted/60"
												onClick={() => {
													if (isUnread) {
														markReadMutation.mutate({ id: item.id });
													}
													setOpen(false);
												}}
											>
												{content}
											</Link>
										) : (
											<button
												type="button"
												className="block w-full px-4 py-3 text-left transition-colors hover:bg-muted/60"
												onClick={() => {
													if (isUnread) {
														markReadMutation.mutate({ id: item.id });
													}
												}}
											>
												{content}
											</button>
										)}
									</li>
								);
							})}
						</ul>
					)}
				</div>
				<div className="border-t px-4 py-2">
					<Link
						href={"/settings/notifications" as Route}
						className="text-muted-foreground text-sm transition-colors hover:text-foreground"
						onClick={() => setOpen(false)}
					>
						Notification settings
					</Link>
				</div>
			</PopoverContent>
		</Popover>
	);
}
