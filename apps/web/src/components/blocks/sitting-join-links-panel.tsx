"use client";

import type { InviteLinkList } from "@bbrc/api/modules/sitting/sitting-join.schema";
import {
	DEFAULT_INVITE_LINK_DAYS,
	MAX_SITTING_INVITE_LINKS,
} from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Switch } from "@bbrc/ui/components/switch";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, Link2, QrCode as QrIcon, Share2, XCircle } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import {
	DateTimePicker,
	type DateTimePreset,
} from "@/components/blocks/date-time-picker";
import { QrCode } from "@/components/blocks/qr-code";
import { orpc, queryClient } from "@/utils/orpc";

type Link = InviteLinkList["items"][number];

const STATE_LABELS: Record<Link["state"], string> = {
	active: "Active",
	revoked: "Revoked",
	expired: "Expired",
	exhausted: "Used up",
};

function linkUrl(token: string) {
	return `${window.location.origin}/sittings/join/${token}`;
}

function formatDate(value: Date | string) {
	return new Date(value).toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

const EXPIRY_PRESETS: readonly DateTimePreset[] = [
	{ label: "1 day", days: 1 },
	{ label: "3 days", days: 3 },
	{ label: "7 days", days: 7 },
	{ label: "30 days", days: 30 },
];

function defaultExpiry() {
	const date = new Date(
		Date.now() + DEFAULT_INVITE_LINK_DAYS * 24 * 60 * 60 * 1000,
	);
	date.setSeconds(0, 0);
	date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5);
	return date;
}

export function SittingJoinLinksPanel({
	sittingSlug,
}: {
	sittingSlug: string;
}) {
	const uid = useId();
	const listOptions = orpc.sitting.join.links.list.queryOptions({
		input: { sittingSlug },
	});
	const list = useQuery(listOptions);
	const [label, setLabel] = useState("");
	const [expires, setExpires] = useState<Date>(defaultExpiry);
	const [neverExpires, setNeverExpires] = useState(false);
	const [maxUses, setMaxUses] = useState("");
	const [qrFor, setQrFor] = useState<string | null>(null);

	const create = useMutation(
		orpc.sitting.join.links.create.mutationOptions({
			onSuccess: () => {
				setLabel("");
				setMaxUses("");
				toast.success("Link created");
			},
			onError: (error) => toast.error(error.message),
			onSettled: () =>
				queryClient.invalidateQueries({ queryKey: listOptions.queryKey }),
		}),
	);

	const revoke = useMutation(
		orpc.sitting.join.links.revoke.mutationOptions({
			onMutate: async ({ linkId }) => {
				await queryClient.cancelQueries({ queryKey: listOptions.queryKey });
				const previous = queryClient.getQueryData(listOptions.queryKey);
				if (previous) {
					queryClient.setQueryData(listOptions.queryKey, {
						items: previous.items.map((item) =>
							item.id === linkId
								? { ...item, state: "revoked" as const, revokedAt: new Date() }
								: item,
						),
					});
				}
				return { previous };
			},
			onError: (error, _vars, context) => {
				if (context?.previous) {
					queryClient.setQueryData(listOptions.queryKey, context.previous);
				}
				toast.error(error.message);
			},
			onSettled: () =>
				queryClient.invalidateQueries({ queryKey: listOptions.queryKey }),
		}),
	);

	const items = list.data?.items ?? [];
	const activeCount = items.filter((item) => item.state === "active").length;
	const atLimit = activeCount >= MAX_SITTING_INVITE_LINKS;

	async function copy(token: string) {
		try {
			await navigator.clipboard.writeText(linkUrl(token));
			toast.success("Link copied");
		} catch {
			toast.error("Could not copy the link");
		}
	}

	async function share(link: Link) {
		const url = linkUrl(link.token);
		if (navigator.share) {
			try {
				await navigator.share({ title: "Join our sitting", url });
			} catch {
				// Dismissed by the member.
			}
			return;
		}
		await copy(link.token);
	}

	return (
		<div className="flex flex-col gap-5">
			<form
				className="flex flex-col gap-3 border border-border p-3"
				onSubmit={(event) => {
					event.preventDefault();
					create.mutate({
						sittingSlug,
						label: label.trim() || undefined,
						expiresAt: neverExpires ? null : expires,
						maxUses: maxUses ? Number(maxUses) : null,
					});
				}}
			>
				<p className="font-medium text-sm">New link</p>
				<div className="grid gap-3 sm:grid-cols-2">
					<label
						htmlFor={`${uid}-label`}
						className="flex flex-col gap-1.5 text-sm"
					>
						Name (only organisers see it)
						<Input
							id={`${uid}-label`}
							value={label}
							maxLength={40}
							onChange={(event) => setLabel(event.target.value)}
							placeholder="Telegram group"
							autoComplete="off"
						/>
					</label>
					<label
						htmlFor={`${uid}-uses`}
						className="flex flex-col gap-1.5 text-sm"
					>
						Most uses
						<Input
							id={`${uid}-uses`}
							type="number"
							min={1}
							max={1000}
							value={maxUses}
							onChange={(event) => setMaxUses(event.target.value)}
							placeholder="No limit"
							inputMode="numeric"
						/>
					</label>
				</div>
				<div className="flex flex-col gap-2 border-border border-t pt-3">
					<div className="flex items-center justify-between gap-3">
						<label htmlFor={`${uid}-expires`} className="font-medium text-sm">
							Stops working on
						</label>
						<span className="flex items-center gap-2 text-muted-foreground text-xs">
							<label htmlFor={`${uid}-never`}>Never expires</label>
							<Switch
								id={`${uid}-never`}
								checked={neverExpires}
								onCheckedChange={setNeverExpires}
							/>
						</span>
					</div>
					<DateTimePicker
						id={`${uid}-expires`}
						value={neverExpires ? null : expires}
						onChange={setExpires}
						min={new Date()}
						presets={EXPIRY_PRESETS}
						disabled={neverExpires}
						placeholder="Never expires"
					/>
				</div>
				<div className="flex items-center justify-between gap-3">
					<p className="text-muted-foreground text-xs">
						{atLimit
							? `You can have ${MAX_SITTING_INVITE_LINKS} active links. Revoke one to make another.`
							: "Anyone with the link can join while it works."}
					</p>
					<Button
						type="submit"
						size="sm"
						disabled={
							create.isPending ||
							atLimit ||
							(!neverExpires && expires.getTime() <= Date.now())
						}
					>
						<Link2 data-icon="inline-start" aria-hidden />
						Create link
					</Button>
				</div>
			</form>

			{list.isPending ? (
				<Skeleton className="h-24 w-full" aria-hidden />
			) : items.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					No links yet. Create one to share in a chat or as a QR code.
				</p>
			) : (
				<ul className="flex flex-col gap-3">
					{items.map((link) => {
						const live = link.state === "active";
						return (
							<li
								key={link.id}
								className="flex flex-col gap-3 border border-border p-3"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="flex min-w-0 items-center gap-2">
										<span className="truncate font-medium text-sm">
											{link.label ?? "Untitled link"}
										</span>
										<Badge variant={live ? "default" : "secondary"}>
											{STATE_LABELS[link.state]}
										</Badge>
									</div>
									<span className="text-muted-foreground text-xs tabular-nums">
										{link.uses}
										{link.maxUses != null ? ` of ${link.maxUses}` : ""} joined ·{" "}
										{link.opens} opened
									</span>
								</div>
								<p className="text-muted-foreground text-xs">
									Created {formatDate(link.createdAt)}
									{link.expiresAt
										? ` · ${live ? "expires" : "expired"} ${formatDate(link.expiresAt)}`
										: " · never expires"}
								</p>
								{live ? (
									<div className="flex flex-wrap gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => void copy(link.token)}
										>
											<Copy data-icon="inline-start" aria-hidden />
											Copy
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => void share(link)}
										>
											<Share2 data-icon="inline-start" aria-hidden />
											Share
										</Button>
										<Button
											size="sm"
											variant="outline"
											aria-expanded={qrFor === link.id}
											onClick={() =>
												setQrFor(qrFor === link.id ? null : link.id)
											}
										>
											<QrIcon data-icon="inline-start" aria-hidden />
											QR code
										</Button>
										<Button
											size="sm"
											variant="ghost"
											className="text-destructive"
											disabled={revoke.isPending}
											onClick={() => revoke.mutate({ linkId: link.id })}
										>
											<XCircle data-icon="inline-start" aria-hidden />
											Revoke
										</Button>
									</div>
								) : null}
								{live && qrFor === link.id ? (
									<QrCode
										value={linkUrl(link.token)}
										downloadName={`bbrc-sitting-${sittingSlug}`}
									/>
								) : null}
								{link.joins.length > 0 ? (
									<details className="text-sm">
										<summary className="cursor-pointer text-muted-foreground text-xs">
											Who joined ({link.joins.length})
										</summary>
										<ul className="mt-2 flex flex-col gap-1">
											{link.joins.map((joined) => (
												<li
													key={joined.username}
													className="flex justify-between gap-3 text-xs"
												>
													<span className="truncate">
														{joined.name}{" "}
														<span className="text-muted-foreground">
															@{joined.username}
														</span>
													</span>
													<span className="shrink-0 text-muted-foreground tabular-nums">
														{formatDate(joined.joinedAt)}
													</span>
												</li>
											))}
										</ul>
									</details>
								) : null}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
