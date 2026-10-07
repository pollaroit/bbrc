"use client";

import { Button } from "@bbrc/ui/components/button";
import { Card, CardContent } from "@bbrc/ui/components/card";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { Separator } from "@bbrc/ui/components/separator";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { SittingDeadlinePicker } from "@/components/blocks/sitting-deadline-picker";
import { UserPanel } from "@/components/blocks/user-panel";
import { UserStatusBadge } from "@/components/blocks/user-status-badge";
import { useAppForm } from "@/hooks/use-app-form";
import {
	CreateSittingFormSchema,
	defaultCreateSittingFormValues,
	toCreateSittingInput,
} from "@/lib/create-sitting-form";
import { invalidateUserPointQueries } from "@/lib/invalidate-user-points";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

function useAllUsers() {
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

	useEffect(() => {
		if (query.hasNextPage && !query.isFetchingNextPage) {
			void query.fetchNextPage();
		}
	}, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

	const users = useMemo(
		() => query.data?.pages.flatMap((page) => page.items) ?? [],
		[query.data],
	);

	return {
		users,
		isPending: query.isPending || query.hasNextPage,
		isError: query.isError,
		refetch: query.refetch,
	};
}

export function CreateSittingForm() {
	const router = useRouter();
	const { users, isPending: isLoadingUsers, isError, refetch } = useAllUsers();

	const defaultParticipantIds = useMemo(
		() =>
			users.filter((user) => user.status !== "banned").map((user) => user.id),
		[users],
	);

	const form = useAppForm(CreateSittingFormSchema, {
		...defaultCreateSittingFormValues,
		participantUserIds: defaultParticipantIds,
	});

	useEffect(() => {
		if (defaultParticipantIds.length === 0) {
			return;
		}

		const current = form.getValues("participantUserIds");
		if (current.length === 0) {
			form.setValue("participantUserIds", defaultParticipantIds, {
				shouldDirty: false,
			});
		}
	}, [defaultParticipantIds, form]);

	const selectedIds = form.watch("participantUserIds");

	const createMutation = useMutation(
		orpc.sitting.createSitting.mutationOptions({
			onSuccess: async (result) => {
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getSittingList.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.sitting.getOngoingSitting.key(),
				});
				await invalidateUserPointQueries();
				toast.success("Sitting started — participants earned participation XP");
				router.push(`/sittings/${result.slug}` as Route);
			},
			onError: (error) => {
				toast.error(error.message ?? "Could not start sitting");
			},
		}),
	);

	function toggleParticipant(userId: string, checked: boolean) {
		const next = checked
			? [...new Set([...selectedIds, userId])]
			: selectedIds.filter((id) => id !== userId);

		form.setValue("participantUserIds", next, { shouldValidate: true });
	}

	return (
		<form
			className="flex max-w-2xl flex-col gap-8"
			onSubmit={form.handleSubmit((values) => {
				createMutation.mutate(toCreateSittingInput(values));
			})}
		>
			<FieldSet>
				<FieldLegend>Poll schedule</FieldLegend>
				<FieldDescription>
					Pick the calendar day when voting closes (deadline snaps to 14:00,
					17:00, 20:00, or 23:00 club time; default is about 12 hours ahead).
					The reading deadline is calculated from the chosen book&apos;s page
					count when reading starts.
				</FieldDescription>
				<FieldGroup>
					<form.Input
						name="pollDeadline"
						render={(field, fieldState) => (
							<SittingDeadlinePicker
								id={field.name}
								label="Poll deadline"
								value={field.value}
								onChange={field.onChange}
								invalid={fieldState.invalid}
								errorMessage={fieldState.error?.message}
							/>
						)}
					/>
				</FieldGroup>
			</FieldSet>

			<Separator />

			<FieldSet>
				<FieldLegend>Poll configuration</FieldLegend>
				<FieldDescription>
					Wishlist books matching the page filters are chosen at random for the
					poll.
				</FieldDescription>
				<FieldGroup className="grid gap-4 sm:grid-cols-2">
					<form.Input
						name="poll.minPages"
						label="Minimum pages"
						render={(field, fieldState) => (
							<Input
								id={field.name}
								type="number"
								min={0}
								aria-invalid={fieldState.invalid}
								value={field.value ?? ""}
								onChange={field.onChange}
								onBlur={field.onBlur}
								name={field.name}
								ref={field.ref}
							/>
						)}
					/>
					<form.Input
						name="poll.maxPages"
						label="Maximum pages"
						render={(field, fieldState) => (
							<Input
								id={field.name}
								type="number"
								min={0}
								aria-invalid={fieldState.invalid}
								value={field.value ?? ""}
								onChange={field.onChange}
								onBlur={field.onBlur}
								name={field.name}
								ref={field.ref}
							/>
						)}
					/>
					<form.Input
						name="poll.take"
						label="Number of options"
						render={(field, fieldState) => (
							<>
								<Input
									id={field.name}
									type="number"
									min={2}
									max={12}
									aria-invalid={fieldState.invalid}
									value={field.value}
									onChange={field.onChange}
									onBlur={field.onBlur}
									name={field.name}
									ref={field.ref}
								/>
								<FieldDescription>Between 2 and 12.</FieldDescription>
							</>
						)}
					/>
					<form.Input
						name="poll.minChoices"
						label="Minimum choices per voter"
						render={(field, fieldState) => (
							<Input
								id={field.name}
								type="number"
								min={1}
								max={12}
								aria-invalid={fieldState.invalid}
								value={field.value}
								onChange={field.onChange}
								onBlur={field.onBlur}
								name={field.name}
								ref={field.ref}
							/>
						)}
					/>
					<form.Input
						name="poll.maxChoices"
						label="Maximum choices per voter"
						render={(field, fieldState) => (
							<Input
								id={field.name}
								type="number"
								min={1}
								max={12}
								aria-invalid={fieldState.invalid}
								value={field.value}
								onChange={field.onChange}
								onBlur={field.onBlur}
								name={field.name}
								ref={field.ref}
							/>
						)}
					/>
				</FieldGroup>
			</FieldSet>

			<Separator />

			<FieldSet>
				<FieldLegend>Participants</FieldLegend>
				<FieldDescription>
					All members are listed. Banned members appear muted but can still be
					included if you select them.
				</FieldDescription>

				{isLoadingUsers ? (
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{Array.from({ length: 4 }, (_, index) => (
							<Skeleton key={index} className="h-20 w-full" />
						))}
					</div>
				) : isError ? (
					<Field>
						<p className="text-destructive text-sm">Could not load members.</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								void refetch();
							}}
						>
							Retry
						</Button>
					</Field>
				) : (
					<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{users.map((user) => {
							const checked = selectedIds.includes(user.id);
							const isBanned = user.status === "banned";

							return (
								<li key={user.id}>
									<Label
										className={cn(
											"block cursor-pointer",
											isBanned && "opacity-60",
										)}
									>
										<Card
											size="sm"
											className="transition-colors hover:bg-muted/40"
										>
											<CardContent className="flex items-start gap-3">
												<Checkbox
													checked={checked}
													onCheckedChange={(value) => {
														toggleParticipant(user.id, value === true);
													}}
													className="mt-0.5"
												/>
												<div className="flex min-w-0 flex-1 flex-col gap-2">
													<UserPanel user={user} />
													<UserStatusBadge status={user.status} />
												</div>
											</CardContent>
										</Card>
									</Label>
								</li>
							);
						})}
					</ul>
				)}

				{form.formState.errors.participantUserIds ? (
					<p className="text-destructive text-sm">
						{form.formState.errors.participantUserIds.message}
					</p>
				) : null}
			</FieldSet>

			<div className="flex flex-wrap gap-2">
				<form.Submit loading={createMutation.isPending}>
					Start sitting
				</form.Submit>
				<Button
					render={<Link href={"/sittings" as Route} />}
					nativeButton={false}
					type="button"
					variant="outline"
				>
					Cancel
				</Button>
			</div>
		</form>
	);
}
