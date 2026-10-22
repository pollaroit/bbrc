"use client";

import type { PreviewSittingPollOptionsOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Button } from "@bbrc/ui/components/button";
import {
	keepPreviousData,
	useInfiniteQuery,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateSittingBallotFields } from "@/components/blocks/create-sitting-ballot-fields";
import { CreateSittingDeadlineField } from "@/components/blocks/create-sitting-deadline-field";
import { CreateSittingParticipantsPicker } from "@/components/blocks/create-sitting-participants-picker";
import { CreateSittingPollFilters } from "@/components/blocks/create-sitting-poll-filters";
import { CreateSittingPollReview } from "@/components/blocks/create-sitting-poll-review";
import { CreateSittingSteps } from "@/components/blocks/create-sitting-steps";
import { ShelfEditorSection } from "@/components/blocks/shelf-editor-shell";
import { useAppForm } from "@/hooks/use-app-form";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
	CreateSittingFormSchema,
	type CreateSittingFormValues,
	defaultCreateSittingFormValues,
	livePollInputFromForm,
	toCreateSittingInput,
	toPreviewSittingPollOptionsInput,
} from "@/lib/create-sitting-form";
import { formatDateTime } from "@/lib/format-datetime";
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

	const pollValues = form.watch("poll");
	const pollDeadline = form.watch("pollDeadline");
	const livePoll = useMemo(
		() => livePollInputFromForm(pollValues),
		[pollValues],
	);
	const debouncedPoll = useDebouncedValue(livePoll, 400);

	const poolQuery = useQuery({
		...orpc.sitting.getSittingPollPoolSize.queryOptions({
			input: { poll: debouncedPoll ?? {} },
		}),
		enabled: debouncedPoll != null,
		placeholderData: keepPreviousData,
		retry: false,
	});

	const pool = poolQuery.data;
	const take = livePoll?.take ?? pollValues.take;
	const poolTooSmall =
		pool != null && typeof take === "number" && pool.eligiblePoolSize < take;
	if (step === "review" && configureValues != null && review != null) {
		return (
			<div className="flex flex-col gap-6">
				<CreateSittingSteps step="review" />
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
			</div>
		);
	}

	const selectedCount = selectedIds.length;
	const canContinue = selectedCount > 0 && !poolTooSmall;

	const maxChoices = livePoll?.maxChoices;
	const minChoices = livePoll?.minChoices;

	return (
		<form
			className="flex flex-col gap-6"
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
			<CreateSittingSteps step="configure" />

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start xl:gap-8">
				<div className="flex min-w-0 flex-col gap-5">
					<ShelfEditorSection
						title="Who is reading"
						description="Everyone selected joins this round, can vote, and earns participation XP."
					>
						<CreateSittingParticipantsPicker
							users={users}
							selectedIds={selectedIds}
							onChange={(ids) =>
								form.setValue("participantUserIds", ids, {
									shouldValidate: true,
								})
							}
							isLoading={isLoadingUsers}
							isError={isError}
							onRetry={() => {
								void refetch();
							}}
							errorMessage={form.formState.errors.participantUserIds?.message}
						/>
					</ShelfEditorSection>

					<ShelfEditorSection
						title="Voting closes"
						description="Voting can end at 2PM, 5PM, 8PM or 11PM club time. The reading deadline is set from the winning book when reading starts."
					>
						<form.Input
							name="pollDeadline"
							render={(field, fieldState) => (
								<CreateSittingDeadlineField
									id={field.name}
									value={field.value}
									onChange={field.onChange}
									invalid={fieldState.invalid}
									errorMessage={fieldState.error?.message}
								/>
							)}
						/>
					</ShelfEditorSection>

					<ShelfEditorSection
						title="Book pool"
						description="Only wishlist books that pass the read-after rules, whose earlier series books are done, and every filter below can appear on the poll."
					>
						<PoolStatus
							size={pool?.eligiblePoolSize}
							take={typeof take === "number" ? take : undefined}
							loading={poolQuery.isFetching}
						/>
						<CreateSittingPollFilters form={form} />
					</ShelfEditorSection>

					<ShelfEditorSection
						title="Ballot"
						description="How many books go on the poll and how many each member can back."
					>
						<CreateSittingBallotFields form={form} />
					</ShelfEditorSection>
				</div>

				<aside className="flex flex-col gap-4 border border-border p-4 xl:sticky xl:top-20">
					<h2 className="font-medium text-base">Summary</h2>
					<dl className="flex flex-col gap-3 text-sm">
						<SummaryRow label="Readers">
							{selectedCount} {selectedCount === 1 ? "member" : "members"}
						</SummaryRow>
						<SummaryRow label="Voting closes">
							{formatDateTime(pollDeadline)}
						</SummaryRow>
						<SummaryRow label="Book pool">
							{pool ? (
								<span className={cn(poolTooSmall && "text-destructive")}>
									{pool.eligiblePoolSize}{" "}
									{pool.eligiblePoolSize === 1 ? "book" : "books"} match
								</span>
							) : (
								"—"
							)}
						</SummaryRow>
						<SummaryRow label="On the poll">
							{typeof take === "number" ? `${take} books` : "—"}
						</SummaryRow>
						<SummaryRow label="Each member picks">
							{minChoices != null && maxChoices != null
								? minChoices === maxChoices
									? `${maxChoices}`
									: `${minChoices} to ${maxChoices}`
								: "—"}
						</SummaryRow>
					</dl>

					{poolTooSmall ? (
						<p className="border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-sm">
							Only {pool?.eligiblePoolSize} books match, but the poll needs{" "}
							{take}. Loosen a filter or lower the number of books.
						</p>
					) : null}

					<div className="flex flex-col gap-2 border-border border-t pt-4">
						<form.Submit
							loading={previewMutation.isPending}
							disabled={!canContinue}
						>
							Draw the poll
						</form.Submit>
						<Button
							render={<Link href={"/sittings" as Route} />}
							nativeButton={false}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<p className="text-muted-foreground text-xs leading-relaxed">
							You'll see the drawn books next, and can swap, lock or shuffle
							them before voting opens.
						</p>
					</div>
				</aside>
			</div>
		</form>
	);
}

function SummaryRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-baseline justify-between gap-3">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="text-right font-medium tabular-nums">{children}</dd>
		</div>
	);
}

function PoolStatus({
	size,
	take,
	loading,
}: {
	size: number | undefined;
	take: number | undefined;
	loading: boolean;
}) {
	if (size == null) {
		return <p className="text-muted-foreground text-sm">Counting books…</p>;
	}

	const tooSmall = take != null && size < take;
	return (
		<p
			className={cn(
				"flex items-center gap-2 text-sm tabular-nums",
				tooSmall ? "text-destructive" : "text-foreground",
				loading && "opacity-60",
			)}
			aria-live="polite"
		>
			<span className="font-semibold text-lg">{size}</span>
			<span className="text-muted-foreground">
				{size === 1 ? "book matches" : "books match"}
				{take != null ? ` · ${take} go on the poll` : ""}
			</span>
		</p>
	);
}
