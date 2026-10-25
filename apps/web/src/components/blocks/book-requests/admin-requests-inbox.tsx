"use client";

/**
 * Admin inbox of pending book requests, ranked by "me too" (server order).
 *
 * - `AdminRequestsInbox({ onAdd(olid), className? })`: the list itself, for the
 *   Add page's side panel. Each row has a one-click "Add" and a "Decline" with
 *   preset reasons or a custom note (200 characters). Requests older than 90
 *   days carry a "Stale" badge (a flag only; nothing is deleted).
 * - `AdminRequestsInboxSheet({ onAdd, side? })`: a trigger button with the
 *   pending count that opens the inbox in a sheet (bottom sheet on phones).
 */

import { Button } from "@bbrc/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@bbrc/ui/components/sheet";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Textarea } from "@bbrc/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Inbox, Plus, ThumbsUp } from "lucide-react";
import { useId, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { formatAuthors } from "@/components/blocks/book-requests/request-shared";
import { RelativeTime } from "@/components/blocks/relative-time";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

const STALE_MS = 90 * 24 * 60 * 60 * 1000;
const DECLINE_PRESETS = [
	"Already in the library",
	"Not a good fit for the club",
	"Can't find a good edition",
] as const;

function DeclineButton({
	requestId,
	title,
}: {
	requestId: string;
	title: string;
}) {
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const fieldId = useId();
	const pendingOptions = orpc.bookRequest.listPending.queryOptions();
	const openOptions = orpc.bookRequest.listOpen.queryOptions();

	const reject = useMutation(
		orpc.bookRequest.reject.mutationOptions({
			onMutate: async () => {
				await Promise.all([
					queryClient.cancelQueries({ queryKey: pendingOptions.queryKey }),
					queryClient.cancelQueries({ queryKey: openOptions.queryKey }),
				]);
				const previous = {
					pending: queryClient.getQueryData(pendingOptions.queryKey),
					open: queryClient.getQueryData(openOptions.queryKey),
				};
				queryClient.setQueryData(pendingOptions.queryKey, (current) =>
					current
						? {
								count: Math.max(0, current.count - 1),
								items: current.items.filter((item) => item.id !== requestId),
							}
						: current,
				);
				queryClient.setQueryData(openOptions.queryKey, (current) =>
					current
						? {
								count: Math.max(0, current.count - 1),
								items: current.items.filter((item) => item.id !== requestId),
							}
						: current,
				);
				setOpen(false);
				return { previous };
			},
			onSuccess: () => toast.success(`Declined “${title}”.`),
			onError: (error, _vars, context) => {
				if (context) {
					queryClient.setQueryData(
						pendingOptions.queryKey,
						context.previous.pending,
					);
					queryClient.setQueryData(openOptions.queryKey, context.previous.open);
				}
				toast.error(error.message ?? "Could not decline this request.");
			},
			onSettled: () =>
				Promise.all([
					queryClient.invalidateQueries({ queryKey: pendingOptions.queryKey }),
					queryClient.invalidateQueries({ queryKey: openOptions.queryKey }),
					queryClient.invalidateQueries({
						queryKey: orpc.bookRequest.listMine.key(),
					}),
					queryClient.invalidateQueries({
						queryKey: orpc.bookDiscover.lane.key(),
					}),
				]),
		}),
	);

	const trimmed = reason.trim();

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						type="button"
						size="sm"
						variant="ghost"
						className="text-destructive"
					/>
				}
			>
				Decline
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 gap-3 p-3">
				<p className="font-medium text-sm">Why decline “{title}”?</p>
				<div className="flex flex-wrap gap-1.5">
					{DECLINE_PRESETS.map((preset) => (
						<button
							key={preset}
							type="button"
							onClick={() => setReason(preset)}
							aria-pressed={reason === preset}
							className={cn(
								"border px-2 py-1 text-start text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring",
								reason === preset
									? "border-foreground bg-foreground text-background"
									: "border-border hover:bg-muted/50",
							)}
						>
							{preset}
						</button>
					))}
				</div>
				<label htmlFor={fieldId} className="sr-only">
					Reason shown to the requester
				</label>
				<Textarea
					id={fieldId}
					value={reason}
					maxLength={200}
					rows={3}
					placeholder="Or write your own note for the requester"
					onChange={(event) => setReason(event.target.value)}
				/>
				<div className="flex items-center justify-between gap-2">
					<span className="text-2xs text-muted-foreground tabular-nums">
						{trimmed.length}/200
					</span>
					<div className="flex gap-2">
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							disabled={trimmed.length === 0 || reject.isPending}
							onClick={() =>
								reject.mutate({ id: requestId, rejectionReason: trimmed })
							}
						>
							Decline request
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

export function AdminRequestsInbox({
	onAdd,
	className,
}: {
	onAdd: (olid: string) => void;
	className?: string;
}) {
	const { data, isPending, isError } = useQuery(
		orpc.bookRequest.listPending.queryOptions(),
	);

	if (isPending) {
		return (
			<div className={cn("flex flex-col gap-2", className)} aria-hidden>
				{Array.from({ length: 3 }, (_, index) => (
					<Skeleton key={index} className="h-24 w-full" />
				))}
			</div>
		);
	}
	if (isError) {
		return (
			<p className={cn("text-destructive text-sm", className)}>
				Could not load the requests.
			</p>
		);
	}
	if (data.items.length === 0) {
		return (
			<div
				className={cn(
					"flex flex-col items-center gap-2 border border-border border-dashed p-6 text-center text-muted-foreground text-sm",
					className,
				)}
			>
				<Inbox className="size-5" aria-hidden />
				<p className="font-medium text-foreground">Inbox is empty</p>
				<p>New member requests will show up here.</p>
			</div>
		);
	}

	const now = Date.now();
	return (
		<ul className={cn("flex flex-col gap-2", className)}>
			{data.items.map((item) => {
				const stale = now - new Date(item.createdAt).getTime() > STALE_MS;
				const requester =
					item.requester.name?.trim() || item.requester.username;
				return (
					<li
						key={item.id}
						className="flex flex-col gap-2 border border-border bg-card p-3"
					>
						<div className="flex items-start justify-between gap-2">
							<div className="min-w-0">
								<p className="font-medium text-sm leading-snug">{item.title}</p>
								<p className="text-muted-foreground text-xs">
									{formatAuthors(item.authors)}
								</p>
							</div>
							{item.upvoteCount > 0 ? (
								<span
									className="inline-flex shrink-0 items-center gap-1 border border-border px-1.5 py-0.5 text-muted-foreground text-xs tabular-nums"
									title={`${item.upvoteCount} ${item.upvoteCount === 1 ? "member" : "members"} said me too`}
								>
									<ThumbsUp className="size-3" aria-hidden />
									{item.upvoteCount}
								</span>
							) : null}
						</div>
						{item.note ? (
							<p className="border-border border-s-2 ps-2 text-sm leading-snug">
								{item.note}
							</p>
						) : null}
						<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted-foreground">
							<span>{requester}</span>
							<RelativeTime date={item.createdAt} />
							{stale ? (
								<span className="border border-warning/40 bg-warning/10 px-1 text-warning-ink">
									Stale
								</span>
							) : null}
						</p>
						<div className="flex items-center justify-end gap-1">
							<DeclineButton requestId={item.id} title={item.title} />
							<Button type="button" size="sm" onClick={() => onAdd(item.olid)}>
								<Plus data-icon="inline-start" aria-hidden />
								Add
							</Button>
						</div>
					</li>
				);
			})}
		</ul>
	);
}

const subscribeDesktop = (callback: () => void) => {
	const query = window.matchMedia("(min-width: 768px)");
	query.addEventListener("change", callback);
	return () => query.removeEventListener("change", callback);
};

export function AdminRequestsInboxSheet({
	onAdd,
	className,
}: {
	onAdd: (olid: string) => void;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const desktop = useSyncExternalStore(
		subscribeDesktop,
		() => window.matchMedia("(min-width: 768px)").matches,
		() => true,
	);
	const { data } = useQuery(orpc.bookRequest.listPending.queryOptions());
	const count = data?.count ?? 0;

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger
				render={
					<Button
						type="button"
						size="sm"
						variant="outline"
						className={className}
					/>
				}
			>
				<Inbox data-icon="inline-start" aria-hidden />
				Requests
				{count > 0 ? (
					<span className="ms-1 bg-foreground px-1.5 text-3xs text-background tabular-nums">
						{count}
					</span>
				) : null}
			</SheetTrigger>
			<SheetContent
				side={desktop ? "right" : "bottom"}
				className={cn(desktop ? "sm:max-w-md" : "max-h-[85vh]")}
			>
				<SheetHeader className="border-border border-b">
					<SheetTitle>Member requests</SheetTitle>
					<SheetDescription>
						Ranked by “me too”. Add one to open it prefilled, or decline it with
						a reason.
					</SheetDescription>
				</SheetHeader>
				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<AdminRequestsInbox
						onAdd={(olid) => {
							setOpen(false);
							onAdd(olid);
						}}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}
