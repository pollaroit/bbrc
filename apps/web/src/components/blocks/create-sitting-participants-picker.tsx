"use client";

import type { GetUserListOutput } from "@bbrc/api/modules/user/user.schema";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@bbrc/ui/components/avatar";
import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMemo, useState } from "react";
import { ListingSearch } from "@/components/listing/listing-search";
import { cn } from "@/lib/utils";

type User = GetUserListOutput["items"][number];

type CreateSittingParticipantsPickerProps = {
	users: User[];
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	isLoading: boolean;
	isError: boolean;
	onRetry: () => void;
	errorMessage?: string;
};

export function CreateSittingParticipantsPicker({
	users,
	selectedIds,
	onChange,
	isLoading,
	isError,
	onRetry,
	errorMessage,
}: CreateSittingParticipantsPickerProps) {
	const [search, setSearch] = useState("");
	const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

	const query = search.trim().toLowerCase();
	const visible = useMemo(
		() =>
			query
				? users.filter((user) =>
						`${user.name} ${user.username}`.toLowerCase().includes(query),
					)
				: users,
		[users, query],
	);

	const activeIds = useMemo(
		() => users.filter((user) => user.status !== "banned").map((u) => u.id),
		[users],
	);
	const bannedSelected = users.filter(
		(user) => user.status === "banned" && selected.has(user.id),
	).length;

	function toggle(userId: string, checked: boolean) {
		onChange(
			checked
				? [...new Set([...selectedIds, userId])]
				: selectedIds.filter((id) => id !== userId),
		);
	}

	if (isLoading) {
		return (
			<div className="flex flex-col gap-2" aria-hidden>
				{Array.from({ length: 5 }, (_, index) => (
					<Skeleton key={index} className="h-12 w-full" />
				))}
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex items-center gap-3">
				<p className="text-destructive text-sm">Could not load members.</p>
				<Button type="button" variant="outline" size="sm" onClick={onRetry}>
					Retry
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="text-sm tabular-nums">
					<span className="font-medium">{selectedIds.length}</span>
					<span className="text-muted-foreground">
						{" "}
						of {users.length} members selected
						{bannedSelected > 0 ? ` (${bannedSelected} banned)` : ""}
					</span>
				</p>
				<div className="flex flex-wrap gap-1.5">
					<Button
						type="button"
						variant="outline"
						size="xs"
						onClick={() => onChange(activeIds)}
					>
						Everyone active
					</Button>
					<Button
						type="button"
						variant="outline"
						size="xs"
						onClick={() => onChange(users.map((user) => user.id))}
					>
						Select all
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						disabled={selectedIds.length === 0}
						onClick={() => onChange([])}
					>
						Clear
					</Button>
				</div>
			</div>

			<ListingSearch
				value={search}
				onChange={(next) => setSearch(next ?? "")}
				placeholder="Find a member…"
			/>

			<ul className="max-h-80 divide-y divide-border overflow-y-auto border border-border">
				{visible.length === 0 ? (
					<li className="px-3 py-6 text-center text-muted-foreground text-sm">
						No members match.
					</li>
				) : (
					visible.map((user) => {
						const checked = selected.has(user.id);
						const banned = user.status === "banned";
						return (
							<li key={user.id}>
								<label
									htmlFor={`participant-${user.id}`}
									className={cn(
										"flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40",
										checked && "bg-muted/20",
										banned && "opacity-60",
									)}
								>
									<Checkbox
										id={`participant-${user.id}`}
										checked={checked}
										onCheckedChange={(value) => toggle(user.id, value === true)}
										aria-label={`Include ${user.name}`}
									/>
									<Avatar className="size-8">
										<AvatarImage src={user.image ?? undefined} />
										<AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
									</Avatar>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm">{user.name}</span>
										<span className="block truncate text-muted-foreground text-xs">
											@{user.username} · {user.rpLevel.label}
										</span>
									</span>
									{banned ? (
										<span className="shrink-0 border border-destructive/40 px-1.5 py-0.5 text-destructive text-xs">
											Banned
										</span>
									) : null}
								</label>
							</li>
						);
					})
				)}
			</ul>

			{errorMessage ? (
				<p className="text-destructive text-sm">{errorMessage}</p>
			) : null}
		</div>
	);
}
