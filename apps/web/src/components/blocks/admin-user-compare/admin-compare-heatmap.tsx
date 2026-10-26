"use client";

import type { CompareStatsOutput } from "@bbrc/api/modules/user-compare-admin/user-compare-admin.schema";
import { describeScoreBand } from "@bbrc/shared";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChartFrame } from "@/components/blocks/author/author-stats-frame";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { adminComparePairHref } from "@/lib/listing/admin-user-compare-listing";
import { cn } from "@/lib/utils";

type Matrix = CompareStatsOutput["matrix"];

const CELL = 30;
const HEAD = 36;
const LABEL_WIDTH = 150;

/** Fill for a score: the primary colour mixed into the background, so any palette works. */
function cellColor(score: number) {
	return `color-mix(in oklab, var(--primary) ${score}%, var(--background))`;
}

/**
 * Every member against every member. The colour is the score (0 empty, 100 solid), the diagonal
 * is blank. Hover or focus a cell to read it, click to open that pair in the admin compare.
 */
export function AdminCompareHeatmap({ matrix }: { matrix: Matrix }) {
	const router = useRouter();
	const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
	const { members, scores } = matrix;

	const hovered =
		hover && scores[hover.row]?.[hover.col] != null
			? {
					a: members[hover.row],
					b: members[hover.col],
					score: scores[hover.row]?.[hover.col] as number,
				}
			: null;

	const table = {
		columns: ["Member", "Member", "Score"],
		rows: members.flatMap((a, row) =>
			members.flatMap((b, col) => {
				const score = scores[row]?.[col];
				return col > row && score != null ? [[a.name, b.name, score]] : [];
			}),
		),
	};

	return (
		<ChartFrame
			title="Who reads like whom"
			description={`The ${members.length} members with the most reads, each compared with each other. Darker means closer.`}
			table={table}
			footer={
				<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-xs">
					<span className="flex items-center gap-2">
						0
						<span
							aria-hidden
							className="h-2 w-28 border border-border"
							style={{
								background:
									"linear-gradient(to right, var(--background), var(--primary))",
							}}
						/>
						100
					</span>
					<span>Click a cell to open that pair.</span>
				</div>
			}
		>
			{members.length < 2 ? (
				<p className="py-10 text-center text-muted-foreground text-sm">
					Not enough members with reads to draw a matrix.
				</p>
			) : (
				<>
					<p className="min-h-5 text-sm" aria-live="polite" aria-atomic="true">
						{hovered ? (
							<>
								<span className="font-medium">{hovered.a?.name}</span>
								<span className="text-muted-foreground"> and </span>
								<span className="font-medium">{hovered.b?.name}</span>
								<span className="text-muted-foreground"> scored </span>
								<span className="font-medium tabular-nums">
									{hovered.score}
								</span>
								<span className="text-muted-foreground">
									{" "}
									({describeScoreBand(hovered.score).label})
								</span>
							</>
						) : (
							<span className="text-muted-foreground">
								Point at a cell to see the pair.
							</span>
						)}
					</p>
					<div className="max-h-[36rem] max-w-full overflow-auto border border-border">
						<table
							className="border-separate border-spacing-0"
							style={{ width: LABEL_WIDTH + members.length * CELL }}
							aria-label="Pair scores between members"
							onMouseLeave={() => setHover(null)}
						>
							<thead>
								<tr>
									<td
										className="sticky top-0 left-0 z-20 bg-card"
										style={{ width: LABEL_WIDTH, height: HEAD }}
									/>
									{members.map((member) => (
										<th
											key={`col-${member.username}`}
											scope="col"
											className="sticky top-0 z-10 bg-card p-0 text-center font-normal"
											style={{ width: CELL, height: HEAD }}
											title={member.name}
										>
											<span className="flex justify-center">
												<UserAvatar user={member} className="size-6" />
											</span>
											<span className="sr-only">{member.name}</span>
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{members.map((rowMember, row) => (
									<tr key={rowMember.username}>
										<th
											scope="row"
											className="sticky left-0 z-10 bg-card px-2 text-left font-normal"
											style={{ width: LABEL_WIDTH, height: CELL }}
											title={rowMember.name}
										>
											<span className="flex items-center gap-2">
												<UserAvatar
													user={rowMember}
													className="size-5 shrink-0"
												/>
												<span className="truncate text-xs">
													{rowMember.name}
												</span>
											</span>
										</th>
										{members.map((colMember, col) => {
											const score = scores[row]?.[col];
											if (score == null) {
												return (
													<td
														key={colMember.username}
														className="border border-background bg-muted/60"
														style={{ width: CELL, height: CELL }}
													>
														<span className="sr-only">
															{rowMember.name} with themselves
														</span>
													</td>
												);
											}
											const active = hover?.row === row || hover?.col === col;
											return (
												<td
													key={colMember.username}
													className="p-0"
													style={{ width: CELL, height: CELL }}
												>
													<button
														type="button"
														aria-label={`${rowMember.name} and ${colMember.name}: ${score}`}
														onMouseEnter={() => setHover({ row, col })}
														onFocus={() => setHover({ row, col })}
														onClick={() =>
															router.push(
																adminComparePairHref(
																	rowMember.username,
																	colMember.username,
																) as Route,
															)
														}
														className={cn(
															"block size-full border border-background text-2xs tabular-nums outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring",
															score >= 50
																? "text-primary-foreground"
																: "text-foreground",
															hover && !active ? "opacity-60" : "opacity-100",
														)}
														style={{ backgroundColor: cellColor(score) }}
													>
														{members.length <= 18 ? score : null}
													</button>
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}
		</ChartFrame>
	);
}
