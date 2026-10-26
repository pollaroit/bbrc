"use client";

import { Button } from "@bbrc/ui/components/button";
import { Input } from "@bbrc/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, SearchIcon } from "lucide-react";
import { useState } from "react";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { useDebouncedValue } from "@/lib/listing/author-activity-listing";
import { orpc } from "@/utils/orpc";

type PickerItem = {
	username: string;
	name: string;
	image: string | null;
	note: string;
	isMe: boolean;
};

export type CompareMemberPickerProps = {
	/** The member currently shown (only used for the button label). */
	value?: string;
	onSelect: (username: string) => void;
	/** A member to leave out of the list (the other side of the comparison). */
	excludeUsername?: string;
	/** Admins pick from every member, including hidden ones. */
	asAdmin?: boolean;
	/** Button text; defaults to "Change member". */
	label?: string;
	className?: string;
};

/** A button that opens a small search box and lists members to compare with. */
export function CompareMemberPicker({
	value,
	onSelect,
	excludeUsername,
	asAdmin = false,
	label,
	className,
}: CompareMemberPickerProps) {
	const [open, setOpen] = useState(false);
	const [text, setText] = useState("");
	const query = useDebouncedValue(text.trim(), 250);
	const input = { query, ...(excludeUsername ? { excludeUsername } : {}) };

	const memberQuery = useQuery({
		...orpc.userCompare.searchMembers.queryOptions({ input }),
		enabled: open && !asAdmin,
		placeholderData: (previous) => previous,
	});
	const adminQuery = useQuery({
		...orpc.userCompareAdmin.searchMembers.queryOptions({ input }),
		enabled: open && asAdmin,
		placeholderData: (previous) => previous,
	});

	const isPending = asAdmin ? adminQuery.isPending : memberQuery.isPending;
	const items: PickerItem[] = asAdmin
		? (adminQuery.data?.items ?? []).map((member) => ({
				username: member.username,
				name: member.name,
				image: member.image,
				note: [
					member.isHidden ? "hidden" : null,
					member.isBanned ? "banned" : null,
					member.allowCompare ? null : "comparisons off",
				]
					.filter(Boolean)
					.join(", "),
				isMe: false,
			}))
		: (memberQuery.data?.items ?? []).map((member) => ({
				username: member.username,
				name: member.name,
				image: member.image,
				note: `${member.booksRead} ${member.booksRead === 1 ? "book" : "books"}${member.compareOff ? " · comparisons off" : ""}`,
				isMe: member.isMe,
			}));

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="outline"
						size="sm"
						className={className}
						aria-label={label ?? "Change member"}
					/>
				}
			>
				<ArrowLeftRight data-icon="inline-start" aria-hidden />
				{label ?? (value ? "Change" : "Pick a member")}
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72 gap-2 p-2">
				<div className="relative">
					<SearchIcon
						className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						autoFocus
						value={text}
						onChange={(event) => setText(event.target.value)}
						placeholder="Search by name or username"
						aria-label="Search members"
						className="pl-8"
					/>
				</div>
				<ul
					className="flex max-h-64 flex-col overflow-y-auto"
					aria-live="polite"
				>
					{isPending ? (
						Array.from({ length: 4 }, (_, index) => (
							<li key={index} className="p-1.5" aria-hidden>
								<Skeleton className="h-9 w-full" />
							</li>
						))
					) : items.length === 0 ? (
						<li className="px-2 py-4 text-center text-muted-foreground text-sm">
							No member found.
						</li>
					) : (
						items.map((member) => (
							<li key={member.username}>
								<button
									type="button"
									disabled={member.isMe}
									onClick={() => {
										setOpen(false);
										setText("");
										onSelect(member.username);
									}}
									className="flex w-full items-center gap-2.5 px-2 py-1.5 text-left outline-offset-[-2px] transition-colors hover:bg-muted focus-visible:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
								>
									<UserAvatar user={member} className="size-8" />
									<span className="min-w-0 flex-1">
										<span className="block truncate font-medium text-sm">
											{member.name}
											{member.isMe ? " (you)" : ""}
										</span>
										<span className="block truncate text-muted-foreground text-xs">
											@{member.username}
											{member.note ? ` · ${member.note}` : ""}
										</span>
									</span>
								</button>
							</li>
						))
					)}
				</ul>
			</PopoverContent>
		</Popover>
	);
}
