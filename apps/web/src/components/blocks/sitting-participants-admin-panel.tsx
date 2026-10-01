"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Button } from "@bbrc/ui/components/button";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@bbrc/ui/components/sheet";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { UserMinusIcon, UserPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { UserPanel } from "@/components/blocks/user-panel";
import { UserStatusBadge } from "@/components/blocks/user-status-badge";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { formatDateTime } from "@/lib/format-datetime";
import { orpc, queryClient } from "@/utils/orpc";

function useEligibleUsersToAdd(activeUserIds: Set<string>) {
	const query = useInfiniteQuery(
		orpc.user.getUserList.infiniteOptions({
			initialPageParam: undefined as string | undefined,
			getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
			input: (pageCursor) => ({
				limit: 100,
				sortBy: "name",
				sortDirection: "asc",
				...(pageCursor != null ? { cursor: pageCursor } : {}),
			}),
		}),
	);

	const users = useMemo(
		() => query.data?.pages.flatMap((page) => page.items) ?? [],
		[query.data],
	);

	const addable = useMemo(
		() =>
			users.filter(
				(user) => user.status !== "banned" && !activeUserIds.has(user.id),
			),
		[users, activeUserIds],
	);

	return { addable, isPending: query.isPending };
}

export function useParticipantRemoveDialog(sitting: GetSittingBySlugOutput) {
	const router = useRouter();
	const [removeTarget, setRemoveTarget] = useState<
		GetSittingBySlugOutput["participants"][number] | null
	>(null);

	const removeMutation = useMutation(
		orpc.sitting.removeSittingParticipant.mutationOptions({
			onSuccess: async () => {
				toast.success("Participant removed");
				setRemoveTarget(null);
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingBySlug.key(),
				});
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const canRemove = sitting.status === "voting" || sitting.status === "reading";

	const dialog = (
		<DestructiveConfirmDialog
			open={removeTarget != null}
			onOpenChange={(open) => {
				if (!open) setRemoveTarget(null);
			}}
			title="Remove participant?"
			description={
				removeTarget ? (
					<>
						Remove <strong>{removeTarget.name}</strong> from this sitting? Their
						participation XP stays. Poll votes are cleared if voting is still
						open. Members who finished the book cannot be removed.
					</>
				) : null
			}
			confirmLabel="Remove"
			loading={removeMutation.isPending}
			onConfirm={() => {
				if (!removeTarget) return;
				removeMutation.mutate({
					slug: sitting.slug,
					userId: removeTarget.userId,
				});
			}}
		/>
	);

	return {
		canRemove,
		requestRemove: setRemoveTarget,
		removeDialog: dialog,
	};
}

type AddParticipantSheetProps = {
	sitting: GetSittingBySlugOutput;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

function AddParticipantSheet({
	sitting,
	open,
	onOpenChange,
}: AddParticipantSheetProps) {
	const router = useRouter();
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

	const activeUserIds = useMemo(
		() => new Set(sitting.participants.map((p) => p.userId)),
		[sitting.participants],
	);

	const { addable, isPending: isLoadingUsers } =
		useEligibleUsersToAdd(activeUserIds);

	const addMutation = useMutation(
		orpc.sitting.addSittingParticipant.mutationOptions({
			onSuccess: async () => {
				toast.success("Participant added");
				onOpenChange(false);
				setSelectedUserId(null);
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingBySlug.key(),
				});
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex flex-col gap-0 sm:max-w-md">
				<SheetHeader>
					<SheetTitle>Add participant</SheetTitle>
					<SheetDescription>
						Choose a club member who is not already on this sitting.
						Participation XP is only awarded once per sitting.
					</SheetDescription>
				</SheetHeader>
				<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
					{isLoadingUsers ? (
						<p className="text-muted-foreground text-sm">Loading members…</p>
					) : addable.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No eligible members to add.
						</p>
					) : (
						<fieldset className="flex flex-col gap-2">
							<legend className="sr-only">Member to add</legend>
							{addable.map((user) => (
								<label
									key={user.id}
									className="flex cursor-pointer items-start gap-3 border border-border p-3 has-checked:border-primary has-checked:bg-primary/5"
								>
									<input
										type="radio"
										name="addParticipant"
										className="mt-1"
										checked={selectedUserId === user.id}
										onChange={() => setSelectedUserId(user.id)}
									/>
									<span className="flex min-w-0 flex-1 flex-col gap-1">
										<UserPanel user={user} className="min-w-0" />
										<UserStatusBadge status={user.status} />
									</span>
								</label>
							))}
						</fieldset>
					)}
				</div>
				<SheetFooter className="border-border border-t">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={addMutation.isPending}
					>
						Cancel
					</Button>
					<LoadingButton
						type="button"
						disabled={!selectedUserId}
						loading={addMutation.isPending}
						onClick={() => {
							if (!selectedUserId) return;
							addMutation.mutate({
								slug: sitting.slug,
								userId: selectedUserId,
							});
						}}
					>
						Add to sitting
					</LoadingButton>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

export function SittingParticipantsAdminToolbar({
	sitting,
}: {
	sitting: GetSittingBySlugOutput;
}) {
	const [addOpen, setAddOpen] = useState(false);
	const canMutate = sitting.status === "voting" || sitting.status === "reading";

	if (!canMutate) {
		return null;
	}

	return (
		<>
			<Button type="button" size="sm" onClick={() => setAddOpen(true)}>
				<UserPlusIcon data-icon="inline-start" />
				Add member
			</Button>
			<AddParticipantSheet
				sitting={sitting}
				open={addOpen}
				onOpenChange={setAddOpen}
			/>
		</>
	);
}

export function ParticipantRemoveButton({
	onRemove,
	disabled,
	title,
}: {
	onRemove: () => void;
	disabled?: boolean;
	title?: string;
}) {
	return (
		<Button
			type="button"
			size="sm"
			variant="outline"
			disabled={disabled}
			title={title}
			onClick={onRemove}
		>
			<UserMinusIcon data-icon="inline-start" />
			Remove
		</Button>
	);
}

export function SittingRemovedParticipantsSection({
	sitting,
}: {
	sitting: GetSittingBySlugOutput;
}) {
	const removed = sitting.removedParticipants;

	if (removed.length === 0) {
		return null;
	}

	return (
		<section className="flex flex-col gap-3 border border-border border-dashed p-4">
			<h3 className="font-medium text-sm">Removed from sitting</h3>
			<ul className="flex flex-col gap-2">
				{removed.map((participant) => (
					<li
						key={participant.userId}
						className="flex flex-wrap items-center justify-between gap-2 border border-border/60 bg-muted/20 px-3 py-2"
					>
						<UserPanel user={participant} className="min-w-0" />
						<span className="text-muted-foreground text-xs">
							Removed {formatDateTime(participant.removedAt)}
						</span>
					</li>
				))}
			</ul>
		</section>
	);
}
