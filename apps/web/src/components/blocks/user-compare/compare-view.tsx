"use client";

import type { CompareOutput } from "@bbrc/api/modules/user-compare/user-compare.schema";
import { useQuery } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { CompareBooks } from "@/components/blocks/user-compare/compare-books";
import {
	COMPARE_EXTRA_TABS,
	CompareExtrasPanel,
} from "@/components/blocks/user-compare/compare-extras";
import {
	CompareHeader,
	CompareHeaderSkeleton,
} from "@/components/blocks/user-compare/compare-header";
import { orpc } from "@/utils/orpc";

export type { CompareMemberPickerProps } from "@/components/blocks/user-compare/compare-member-picker";
export { CompareMemberPicker } from "@/components/blocks/user-compare/compare-member-picker";

export type CompareViewProps = {
	/** Username shown on the left (for a member this is the viewer). */
	a: string;
	/** Username shown on the right. */
	b: string;
	/** Use the admin procedures (any two members, ignores "Allow others to compare with me"). */
	asAdmin?: boolean;
	/** Called when the other member is swapped in the picker; defaults to the member route. */
	onChangeMember?: (side: "a" | "b", username: string) => void;
};

const TABS = ["books", ...COMPARE_EXTRA_TABS.map((tab) => tab.id)] as const;

/** The whole comparison: header with the score, then the tabs. Runs its own queries. */
export function CompareView({
	a,
	b,
	asAdmin = false,
	onChangeMember,
}: CompareViewProps) {
	const input = { a, b };
	const compare = useQuery(
		asAdmin
			? orpc.userCompareAdmin.compare.queryOptions({ input })
			: orpc.userCompare.compare.queryOptions({ input }),
	);
	const [tab, setTab] = useQueryState(
		"tab",
		parseAsStringLiteral(TABS)
			.withDefault("books")
			.withOptions({ history: "replace", clearOnDefault: true }),
	);

	if (compare.isPending) return <CompareHeaderSkeleton />;

	if (compare.isError || !compare.data) {
		const code = (compare.error as { code?: string } | null)?.code;
		if (code === "NOT_FOUND") {
			return (
				<div className="border border-border border-dashed p-8 text-center">
					<p className="font-medium text-sm">Member not found.</p>
					<p className="mt-1 text-muted-foreground text-sm">
						One of these members does not exist or is not available to compare.
					</p>
				</div>
			);
		}
		return (
			<div className="border border-border border-dashed p-8 text-center">
				<p className="font-medium text-sm">Could not load this comparison.</p>
				<button
					type="button"
					onClick={() => void compare.refetch()}
					className="mt-2 text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
				>
					Try again
				</button>
			</div>
		);
	}

	const data = compare.data;

	return (
		<div className="flex flex-col gap-8">
			<CompareHeader
				data={data}
				asAdmin={asAdmin}
				onChangeMember={onChangeMember}
			/>
			{data.blocked ? (
				<div className="border border-border border-dashed p-8 text-center">
					<p className="font-medium text-sm">
						This member has turned off comparisons.
					</p>
					<p className="mt-1 text-muted-foreground text-sm">
						They chose not to let other members compare their reading with
						theirs.
					</p>
				</div>
			) : (
				<CompareTabs
					a={a}
					b={b}
					asAdmin={asAdmin}
					data={data}
					tab={tab}
					setTab={(next) => void setTab(next)}
				/>
			)}
		</div>
	);
}

function CompareTabs({
	a,
	b,
	asAdmin,
	data,
	tab,
	setTab,
}: {
	a: string;
	b: string;
	asAdmin: boolean;
	data: CompareOutput;
	tab: (typeof TABS)[number];
	setTab: (tab: (typeof TABS)[number]) => void;
}) {
	const tabs = [
		{ id: "books" as const, label: "Books" },
		...COMPARE_EXTRA_TABS,
	];
	return (
		<div className="flex flex-col gap-5">
			<nav
				aria-label="Comparison sections"
				className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
			>
				<ul className="flex w-max min-w-full gap-1 border-border border-b">
					{tabs.map((item) => {
						const active = item.id === tab;
						return (
							<li key={item.id}>
								<button
									type="button"
									onClick={() => setTab(item.id)}
									aria-current={active ? "page" : undefined}
									className={
										active
											? "-mb-px border-foreground border-b-2 px-3 py-2 font-medium text-sm"
											: "-mb-px border-transparent border-b-2 px-3 py-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
									}
								>
									{item.label}
								</button>
							</li>
						);
					})}
				</ul>
			</nav>
			{tab === "books" ? (
				<CompareBooks a={a} b={b} asAdmin={asAdmin} data={data} />
			) : (
				<CompareExtrasPanel
					a={a}
					b={b}
					asAdmin={asAdmin}
					tab={tab}
					data={data}
				/>
			)}
		</div>
	);
}
