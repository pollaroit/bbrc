"use client";

import type { PreviewSittingPollOptionsOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Alert, AlertDescription, AlertTitle } from "@bbrc/ui/components/alert";
import { Button } from "@bbrc/ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@bbrc/ui/components/tooltip";
import { useMutation } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PollOptionReadersDialog } from "@/components/blocks/poll-option-readers-dialog";
import { bookCoverUrl, formatBookAuthors } from "@/lib/book-cover";
import {
	type CreateSittingFormValues,
	toPreviewSittingPollOptionsInput,
} from "@/lib/create-sitting-form";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

type PreviewOption = PreviewSittingPollOptionsOutput["options"][number];

type CreateSittingPollReviewProps = {
	formValues: CreateSittingFormValues;
	initialOptions: PreviewOption[];
	eligiblePoolSize: number;
	initialUsedUniformFallback: boolean;
	participantCount: number;
	onBack: () => void;
	onConfirm: (optionBookIds: string[]) => void;
	confirmLoading: boolean;
};

export function CreateSittingPollReview({
	formValues,
	initialOptions,
	eligiblePoolSize,
	initialUsedUniformFallback,
	participantCount,
	onBack,
	onConfirm,
	confirmLoading,
}: CreateSittingPollReviewProps) {
	const [options, setOptions] = useState(initialOptions);
	const [usedUniformFallback, setUsedUniformFallback] = useState(
		initialUsedUniformFallback,
	);
	const [replacingBookId, setReplacingBookId] = useState<string | null>(null);
	const [readersBookId, setReadersBookId] = useState<string | null>(null);
	const [readersBookCount, setReadersBookCount] = useState(0);

	const previewBase = toPreviewSittingPollOptionsInput(formValues);

	const replaceMutation = useMutation(
		orpc.sitting.replaceSittingPollPreviewOption.mutationOptions(),
	);

	async function replaceOption(replaceBookId: string) {
		setReplacingBookId(replaceBookId);
		try {
			const result = await replaceMutation.mutateAsync({
				...previewBase,
				currentOptionBookIds: options.map((option) => option.book.id),
				replaceBookId,
			});
			setOptions((current) =>
				current.map((option) =>
					option.book.id === replaceBookId ? result.option : option,
				),
			);
			if (result.usedUniformFallback) {
				setUsedUniformFallback(true);
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Could not replace option",
			);
		} finally {
			setReplacingBookId(null);
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
			<div>
				<h2 className="font-semibold text-lg">Review poll options</h2>
				<p className="text-muted-foreground text-sm">
					These wishlist books were drawn for the poll. Replace any option to
					reroll one eligible book before voting starts.{" "}
					<span className="text-foreground">
						{eligiblePoolSize} books match your filters.
					</span>
				</p>
			</div>

			{usedUniformFallback ? (
				<Alert>
					<AlertTitle>Uniform random draw</AlertTitle>
					<AlertDescription>
						Every participant has read the remaining eligible books (or weights
						were otherwise zero), so the last pick used a uniform random choice
						from the pool.
					</AlertDescription>
				</Alert>
			) : null}

			<ul className="flex flex-col gap-3">
				{options.map((option) => {
					const coverSrc = bookCoverUrl(option.book.coverId);
					const href = `/books/${option.book.slug}` as Route;
					const readCount = option.participantReadCount;
					const readLabel =
						participantCount > 0
							? `${readCount} of ${participantCount} participants read`
							: `${readCount} read`;
					const isReplacing = replacingBookId === option.book.id;

					return (
						<li key={option.book.id}>
							<div className="relative flex items-stretch gap-3 border border-border p-4 pl-5">
								<div
									className="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-border"
									aria-hidden
								/>
								<Link
									href={href}
									className="relative aspect-2/3 w-16 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10 sm:w-20"
								>
									{coverSrc ? (
										<Image
											src={coverSrc}
											alt=""
											fill
											className="object-cover"
											sizes="80px"
										/>
									) : (
										<div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
											No cover
										</div>
									)}
								</Link>

								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<Link
										href={href}
										className="line-clamp-2 font-medium text-sm leading-snug hover:underline"
									>
										{option.book.title}
									</Link>
									<p className="text-muted-foreground text-sm">
										{formatBookAuthors(option.book.authors)}
									</p>
									<p className="text-muted-foreground text-xs tabular-nums">
										{option.book.pages != null
											? `${option.book.pages} pp · `
											: null}
										{participantCount > 0 ? (
											<button
												type="button"
												className="text-foreground underline-offset-2 hover:underline"
												onClick={() => {
													setReadersBookCount(readCount);
													setReadersBookId(option.book.id);
												}}
											>
												{readLabel}
											</button>
										) : (
											readLabel
										)}
									</p>
								</div>

								<div className="flex shrink-0 items-start">
									<Tooltip>
										<TooltipTrigger
											render={
												<Button
													type="button"
													variant="outline"
													size="icon-sm"
													disabled={replacingBookId != null && !isReplacing}
													aria-label="Replace with another random book"
													onClick={() => {
														void replaceOption(option.book.id);
													}}
												>
													<RefreshCw
														className={cn(
															"size-4",
															isReplacing && "animate-spin",
														)}
													/>
												</Button>
											}
										/>
										<TooltipContent>Replace option</TooltipContent>
									</Tooltip>
								</div>
							</div>
						</li>
					);
				})}
			</ul>

			<PollOptionReadersDialog
				source="preview"
				bookId={readersBookId}
				participantUserIds={formValues.participantUserIds}
				readCount={readersBookCount}
				onDismiss={() => {
					setReadersBookId(null);
				}}
			/>

			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					disabled={confirmLoading || replacingBookId != null}
					onClick={() => {
						onConfirm(options.map((option) => option.book.id));
					}}
				>
					{confirmLoading ? "Creating…" : "Create sitting"}
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={confirmLoading || replacingBookId != null}
					onClick={onBack}
				>
					Back to configuration
				</Button>
			</div>
		</div>
	);
}
