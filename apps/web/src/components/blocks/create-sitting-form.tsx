"use client";

import type { PreviewSittingPollOptionsOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import {
	Field,
	FieldGroup,
	FieldLegend,
	FieldSet,
} from "@bbrc/ui/components/field";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateSittingPollFilters } from "@/components/blocks/create-sitting-poll-filters";
import { CreateSittingPollReview } from "@/components/blocks/create-sitting-poll-review";
import { SittingDeadlinePicker } from "@/components/blocks/sitting-deadline-picker";
import { UserPanel } from "@/components/blocks/user-panel";
import { UserStatusBadge } from "@/components/blocks/user-status-badge";
import { useAppForm } from "@/hooks/use-app-form";
import {
	CreateSittingFormSchema,
	type CreateSittingFormValues,
	defaultCreateSittingFormValues,
	toCreateSittingInput,
	toPreviewSittingPollOptionsInput,
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

type ReviewState = Pick<
	PreviewSittingPollOptionsOutput,
	"options" | "eligiblePoolSize" | "usedUniformFallback"
>;

export function CreateSittingForm() {
	const router = useRouter();
	const { users, isPending: isLoadingUsers, isError, refetch } = useAllUsers();
	const [step, setStep] = useState<"configure" | "review">("configure");
	const [review, setReview] = useState<ReviewState | null>(null);
	const [configureValues, setConfigureValues] =
		useState<CreateSittingFormValues | null>(null);

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

	const previewMutation = useMutation(
		orpc.sitting.previewSittingPollOptions.mutationOptions({
			onError: (error) => {
				toast.error(error.message ?? "Could not draw poll options");
			},
		}),
	);

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

	if (step === "review" && configureValues != null && review != null) {
		return (
			<CreateSittingPollReview
				formValues={configureValues}
				initialOptions={review.options}
				eligiblePoolSize={review.eligiblePoolSize}
				initialUsedUniformFallback={review.usedUniformFallback}
				participantCount={configureValues.participantUserIds.length}
				confirmLoading={createMutation.isPending}
				onBack={() => {
					setStep("configure");
				}}
				onConfirm={(optionBookIds) => {
					createMutation.mutate(
						toCreateSittingInput(configureValues, optionBookIds),
					);
				}}
			/>
		);
	}

	function toggleParticipant(userId: string, checked: boolean) {
		const next = checked
			? [...new Set([...selectedIds, userId])]
			: selectedIds.filter((id) => id !== userId);

		form.setValue("participantUserIds", next, { shouldValidate: true });
	}

	const selectedCount = selectedIds.length;

	return (
		<form
			className="flex flex-col gap-8"
			onSubmit={form.handleSubmit((values) => {
				setConfigureValues(values);
				previewMutation.mutate(toPreviewSittingPollOptionsInput(values), {
					onSuccess: (result) => {
						setReview({
							options: result.options,
							eligiblePoolSize: result.eligiblePoolSize,
							usedUniformFallback: result.usedUniformFallback,
						});
						setStep("review");
					},
				});
			})}
		>
			<div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] xl:items-start">
				<div className="flex min-w-0 flex-col gap-6">
					<Card>
						<CardHeader className="border-border border-b pb-4">
							<CardTitle className="text-base">Voting deadline</CardTitle>
							<CardDescription>
								When the book poll closes. Times snap to 14:00, 17:00, 20:00, or
								23:00 club time (default is about 12 hours ahead). Reading
								deadline is set from the winning book when reading starts.
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-6">
							<FieldGroup>
								<form.Input
									name="pollDeadline"
									render={(field, fieldState) => (
										<SittingDeadlinePicker
											mode="poll"
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
						</CardContent>
					</Card>

					<CreateSittingPollFilters form={form} />
				</div>

				<aside className="flex flex-col gap-4 xl:sticky xl:top-6">
					<Card>
						<CardHeader className="border-border border-b pb-4">
							<CardTitle className="text-base">Participants</CardTitle>
							<CardDescription>
								{selectedCount} selected
								{users.length > 0 ? ` of ${users.length} members` : ""}. Banned
								members stay muted but can be included if you check them.
							</CardDescription>
						</CardHeader>
						<CardContent className="max-h-[min(70vh,36rem)] overflow-y-auto pt-4">
							{isLoadingUsers ? (
								<ul className="flex flex-col gap-2">
									{Array.from({ length: 5 }, (_, index) => (
										<Skeleton key={index} className="h-16 w-full" />
									))}
								</ul>
							) : isError ? (
								<Field>
									<p className="text-destructive text-sm">
										Could not load members.
									</p>
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
								<FieldSet>
									<FieldLegend className="sr-only">Member list</FieldLegend>
									<ul className="flex flex-col gap-1">
										{users.map((user) => {
											const checked = selectedIds.includes(user.id);
											const isBanned = user.status === "banned";

											return (
												<li key={user.id}>
													<div
														className={cn(
															"flex items-start gap-3 border border-transparent px-2 py-2 transition-colors hover:bg-muted/40",
															isBanned && "opacity-60",
														)}
													>
														<Checkbox
															checked={checked}
															onCheckedChange={(value) => {
																toggleParticipant(user.id, value === true);
															}}
															className="mt-1"
															aria-label={`Include ${user.name}`}
														/>
														<div className="flex min-w-0 flex-1 flex-col gap-1.5">
															<UserPanel user={user} />
															<UserStatusBadge status={user.status} />
														</div>
													</div>
												</li>
											);
										})}
									</ul>
								</FieldSet>
							)}

							{form.formState.errors.participantUserIds ? (
								<p className="mt-3 text-destructive text-sm">
									{form.formState.errors.participantUserIds.message}
								</p>
							) : null}
						</CardContent>
					</Card>
				</aside>
			</div>

			<div className="flex flex-wrap items-center gap-2 border-border border-t pt-6">
				<form.Submit loading={previewMutation.isPending}>
					Continue to review
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
