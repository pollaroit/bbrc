"use client";

import { Button } from "@bbrc/ui/components/button";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Field,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { ScrollArea } from "@bbrc/ui/components/scroll-area";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { orpc } from "@/utils/orpc";

type ListingMemberMultiSelectProps = {
	legend?: string;
	selectedUsernames: string[];
	onSelectedUsernamesChange: (usernames: string[]) => void;
};

export function ListingMemberMultiSelect({
	legend: legendProp,
	selectedUsernames,
	onSelectedUsernamesChange,
}: ListingMemberMultiSelectProps) {
	const t = useTranslations("listing");
	const legend = legendProp ?? t("multi.members.legend");
	const [search, setSearch] = useState("");

	const membersQuery = useQuery(
		orpc.admin.listUsers.queryOptions({
			input: {
				limit: 60,
				page: 1,
				sortBy: "username",
				sortDirection: "asc",
				search: search.trim() || undefined,
			},
		}),
	);

	const members = membersQuery.data?.items ?? [];

	const visibleMembers = useMemo(() => members, [members]);

	const toggle = (username: string, checked: boolean) => {
		const next = checked
			? [...new Set([...selectedUsernames, username])]
			: selectedUsernames.filter((value) => value !== username);
		onSelectedUsernamesChange(next);
	};

	return (
		<FieldSet>
			<FieldLegend>{legend}</FieldLegend>
			<Field>
				<FieldLabel className="sr-only">Search members</FieldLabel>
				<div className="relative">
					<SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={t("multi.members.placeholder")}
						className="pl-9"
						aria-label={t("multi.members.aria")}
					/>
				</div>
			</Field>
			{selectedUsernames.length > 0 ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onSelectedUsernamesChange([])}
				>
					Clear members ({selectedUsernames.length})
				</Button>
			) : null}
			<ScrollArea className="h-48 border border-border">
				{membersQuery.isPending ? (
					<div className="flex flex-col gap-2 p-3">
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-8 w-full" />
					</div>
				) : membersQuery.isError ? (
					<p className="p-3 text-destructive text-sm">
						{membersQuery.error.message}
					</p>
				) : visibleMembers.length === 0 ? (
					<p className="p-3 text-muted-foreground text-sm">No members match.</p>
				) : (
					<ul className="divide-y divide-border">
						{visibleMembers.map((member) => (
							<li key={member.id}>
								<div className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/40">
									<Checkbox
										checked={selectedUsernames.includes(member.username)}
										onCheckedChange={(checked) => {
											toggle(member.username, checked === true);
										}}
									/>
									<UserAvatar user={member} className="size-8" />
									<span className="min-w-0 flex-1">
										<FieldTitle className="text-sm">{member.name}</FieldTitle>
										<span className="text-muted-foreground text-xs">
											@{member.username}
										</span>
									</span>
								</div>
							</li>
						))}
					</ul>
				)}
			</ScrollArea>
		</FieldSet>
	);
}
