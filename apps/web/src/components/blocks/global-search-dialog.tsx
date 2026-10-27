"use client";

import type { GlobalSearchHit } from "@bbrc/api/modules/search/global-search.schema";
import { getBookCountryName } from "@bbrc/shared";
import { Badge } from "@bbrc/ui/components/badge";
import { Button } from "@bbrc/ui/components/button";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@bbrc/ui/components/command";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import type { Route } from "next";
import { useLocale, useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useComposePost } from "@/components/blocks/compose-post-provider";
import { useCreateGoal } from "@/components/blocks/create-goal-provider";
import { GlobalSearchThumb } from "@/components/blocks/global-search-thumb";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { useColorMode } from "@/lib/preferences/use-color-mode";
import {
	bookFiltersToSearchParams,
	buildSearchCommands,
	type CommandMatch,
	describeBookFilters,
	parseCommandFilters,
	type SearchCommand,
	type SearchCommandContext,
	type SearchTranslate,
	searchCommands,
	suggestedCommands,
} from "@/lib/search/commands";
import {
	type InnerPage,
	innerPageHref,
	innerPagesFor,
	matchInnerPage,
} from "@/lib/search/inner-pages";
import {
	clearRecentHits,
	readRecentHits,
	rememberHit,
} from "@/lib/search/recents";
import { cn } from "@/lib/utils";
import { client, orpc } from "@/utils/orpc";

/** The shown name of an inner page, in the page language. */
function pageLabel(t: SearchTranslate, page: InnerPage): string {
	return t(`pages.${page.scope}.${page.id}` as never);
}

const IDLE_COMMAND_LIMIT = 6;
const TYPED_COMMAND_LIMIT = 6;
const COMMANDS_ONLY_LIMIT = 12;

const rowClassName = cn(
	"mb-0.5 items-center gap-3 border border-transparent px-2.5 py-2.5",
	"data-[selected=true]:border-border data-[selected=true]:bg-muted/45",
);

type ParsedQuery = {
	mode: "all" | "commands" | "members";
	/** Query without the `>` / `@` prefix. */
	text: string;
	/** Text to search resources for: everything before the first colon. */
	term: string;
	/** Text after the first colon, used to pick an inner page. */
	suffix: string;
};

function parseQuery(query: string): ParsedQuery {
	const trimmed = query.trimStart();
	const mode = trimmed.startsWith(">")
		? "commands"
		: trimmed.startsWith("@")
			? "members"
			: "all";
	const text = mode === "all" ? query : trimmed.slice(1);
	const colon = text.indexOf(":");

	return {
		mode,
		text,
		term: (colon === -1 ? text : text.slice(0, colon)).trim(),
		suffix: colon === -1 ? "" : text.slice(colon + 1).trim(),
	};
}

type GlobalSearchDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function GlobalSearchDialog({
	open,
	onOpenChange,
}: GlobalSearchDialogProps) {
	const t = useTranslations("shell.search");
	const tHeader = useTranslations("shell.header");
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const { openCompose } = useComposePost();
	const { openCreateGoal } = useCreateGoal();
	const { toggle: toggleColorMode } = useColorMode();

	const [query, setQuery] = useState("");
	const [highlighted, setHighlighted] = useState("");
	/** Inner page picked with the keyboard or mouse, per result. */
	const [pickedPages, setPickedPages] = useState<Record<string, string | null>>(
		{},
	);
	const [recents, setRecents] = useState<GlobalSearchHit[]>([]);

	const parsed = useMemo(() => parseQuery(query), [query]);
	const debouncedTerm = useDebouncedValue(parsed.term, 300).trim();

	useEffect(() => {
		if (open) {
			setRecents(readRecentHits());
		}
	}, [open]);

	const ongoingQuery = useQuery({
		...orpc.sitting.getOngoingSitting.queryOptions(),
		enabled: open,
	});

	const ctx: SearchCommandContext = useMemo(
		() => ({
			signedIn: Boolean(session?.user),
			isAdmin: session?.user.isAdmin === true,
			username: session?.user.username ?? null,
			ongoingLoaded: ongoingQuery.isSuccess,
			ongoing: ongoingQuery.data
				? {
						slug: ongoingQuery.data.slug,
						viewerIsParticipant: ongoingQuery.data.viewerIsParticipant,
					}
				: null,
		}),
		[session, ongoingQuery.isSuccess, ongoingQuery.data],
	);

	const commands = useMemo(() => buildSearchCommands(t), [t]);

	const hasText = parsed.text.trim().length > 0;
	const commandResult = useMemo(
		() =>
			parsed.mode === "members" || !hasText
				? { matches: [], signInHint: null, hiddenCount: 0 }
				: searchCommands(
						parsed.text,
						commands,
						ctx,
						parsed.mode === "commands"
							? COMMANDS_ONLY_LIMIT
							: TYPED_COMMAND_LIMIT,
					),
		[parsed, hasText, commands, ctx],
	);

	const idleCommands = useMemo(
		() =>
			hasText || parsed.mode === "members"
				? []
				: suggestedCommands(
						commands,
						ctx,
						parsed.mode === "commands"
							? COMMANDS_ONLY_LIMIT
							: IDLE_COMMAND_LIMIT,
					),
		[hasText, parsed.mode, commands, ctx],
	);

	// `settings:pro` is a command, not a search for "settings".
	const commandTail = parsed.suffix !== "" && commandResult.matches.length > 0;
	const canSearch =
		parsed.mode !== "commands" && !commandTail && debouncedTerm.length >= 2;

	const searchQuery = useQuery({
		...orpc.globalSearch.search.queryOptions({
			input: {
				query: debouncedTerm,
				...(parsed.mode === "members" ? { types: ["user" as const] } : {}),
			},
		}),
		enabled: open && canSearch,
	});

	const items = canSearch ? (searchQuery.data?.items ?? []) : [];
	const isSearching =
		canSearch && (searchQuery.isFetching || searchQuery.isPending);
	const hasCommandRows =
		commandResult.matches.length > 0 || commandResult.signInHint != null;
	const showEmpty =
		hasText &&
		!hasCommandRows &&
		!isSearching &&
		items.length === 0 &&
		!searchQuery.isError;

	const close = () => {
		onOpenChange(false);
		setQuery("");
		setHighlighted("");
		setPickedPages({});
	};

	const suffixPage = (hit: GlobalSearchHit): InnerPage | null => {
		const pages = innerPagesFor(hit.type);
		return pages
			? matchInnerPage(pages, parsed.suffix, (page) => pageLabel(t, page))
			: null;
	};

	/** The page the next Enter opens for a result: picked by hand, else typed after a colon. */
	const pageFor = (hit: GlobalSearchHit): InnerPage | null => {
		const pages = innerPagesFor(hit.type);
		if (!pages) {
			return null;
		}
		const picked = pickedPages[hit.href];
		if (picked !== undefined) {
			return pages.find((page) => page.id === picked) ?? null;
		}
		return suffixPage(hit);
	};

	const openHit = (hit: GlobalSearchHit, page: InnerPage | null) => {
		rememberHit(hit);
		const href = page ? innerPageHref(hit, page) : hit.href;
		close();
		router.push(href as Route);
	};

	const runRandom = async (filtersText: string | null) => {
		const result = parseCommandFilters(filtersText);
		if (!result.ok) {
			toast.error(result.error);
			return;
		}
		if (result.filters.viewerRead && !ctx.signedIn) {
			toast.error(t("toasts.signInToFilter"));
			return;
		}

		close();
		const toastId = toast.loading(t("toasts.picking"));
		try {
			const book = await client.book.getRandom(result.filters);
			toast.success(
				book.matched > 1
					? t("toasts.pickedOf", { title: book.title, matched: book.matched })
					: book.title,
				{ id: toastId },
			);
			router.push(`/books/${book.slug}` as Route);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : t("toasts.couldNotPick"),
				{ id: toastId },
			);
		}
	};

	const runCommand = async (match: CommandMatch) => {
		const action = match.command.action(ctx);

		switch (action.kind) {
			case "navigate":
				close();
				router.push(action.href as Route);
				return;
			case "dialog":
				close();
				if (action.dialog === "compose-post") {
					openCompose();
				} else {
					openCreateGoal();
				}
				return;
			case "theme":
				toggleColorMode();
				close();
				return;
			case "signout":
				close();
				try {
					await authClient.signOut();
					router.refresh();
				} catch {
					toast.error(tHeader("signOutFailed"));
				}
				return;
			case "books": {
				const result = parseCommandFilters(match.filtersText);
				if (!result.ok) {
					toast.error(result.error);
					return;
				}
				if (result.filters.viewerRead && !ctx.signedIn) {
					toast.error(t("toasts.signInToFilter"));
					return;
				}
				const search = bookFiltersToSearchParams(result.filters);
				close();
				router.push((search ? `/books?${search}` : "/books") as Route);
				return;
			}
			case "random":
				await runRandom(match.filtersText);
				return;
		}
	};

	const highlightedHit = useMemo(() => {
		const match = /^hit-(\d+)$/.exec(highlighted);
		return match ? (items[Number(match[1])] ?? null) : null;
	}, [highlighted, items]);

	/** → opens a result's page chips one by one, ← steps back; both only apply to books and members. */
	const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (!highlightedHit || event.metaKey || event.ctrlKey || event.altKey) {
			return;
		}
		const pages = innerPagesFor(highlightedHit.type);
		if (!pages) {
			return;
		}

		const input = event.currentTarget;
		const caretAtEnd =
			input.selectionStart === input.value.length &&
			input.selectionEnd === input.value.length;
		const current = pageFor(highlightedHit);
		const index = current
			? pages.findIndex((page) => page.id === current.id)
			: -1;

		const pick = (id: string | null) =>
			setPickedPages((existing) => ({
				...existing,
				[highlightedHit.href]: id,
			}));

		if (event.key === "ArrowRight" && caretAtEnd) {
			event.preventDefault();
			pick(pages[Math.min(index + 1, pages.length - 1)]?.id ?? null);
		} else if (event.key === "ArrowLeft" && index >= 0) {
			event.preventDefault();
			pick(index === 0 ? null : (pages[index - 1]?.id ?? null));
		}
	};

	const showRecents = !hasText && parsed.mode === "all" && recents.length > 0;

	return (
		<CommandDialog
			shouldFilter={false}
			open={open}
			value={highlighted}
			onValueChange={setHighlighted}
			onOpenChange={(nextOpen) => {
				if (nextOpen) {
					onOpenChange(true);
				} else {
					close();
				}
			}}
			title={t("title")}
			description={t("description")}
			className="gap-0 p-0 sm:max-w-xl"
		>
			<CommandInput
				placeholder={t("placeholder")}
				value={query}
				onValueChange={setQuery}
				onKeyDown={onInputKeyDown}
			/>
			<CommandList className="max-h-[min(56vh,24rem)] px-1.5 py-1.5">
				{!hasText && parsed.mode !== "members" ? (
					<>
						<CommandEmpty className="hidden" />
						{idleCommands.length > 0 ? (
							<CommandGroup heading={t("goTo")}>
								{idleCommands.map((command) => (
									<CommandRow
										key={command.id}
										command={command}
										filtersText={null}
										onSelect={() =>
											void runCommand({ command, filtersText: null, score: 0 })
										}
									/>
								))}
							</CommandGroup>
						) : null}
						{showRecents ? (
							<CommandGroup
								heading={
									<span className="flex items-center justify-between">
										{t("recent")}
										<button
											type="button"
											className="text-2xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
											onClick={() => {
												clearRecentHits();
												setRecents([]);
											}}
										>
											{t("clear")}
										</button>
									</span>
								}
							>
								{recents.map((hit, index) => (
									<HitRow
										key={`recent-${hit.href}`}
										value={`recent-${index}`}
										hit={hit}
										page={null}
										chips={false}
										pickedPage={null}
										onPick={() => {}}
										onOpen={(page) => openHit(hit, page)}
									/>
								))}
							</CommandGroup>
						) : null}
						<GlobalSearchIdleHints />
					</>
				) : parsed.mode === "members" && !hasText ? (
					<GlobalSearchMembersHint />
				) : (
					<>
						<CommandEmpty className="hidden" />
						{hasCommandRows ? (
							<CommandGroup heading={t("goTo")}>
								{commandResult.matches.map((match) => (
									<CommandRow
										key={match.command.id}
										command={match.command}
										filtersText={match.filtersText}
										onSelect={() => void runCommand(match)}
									/>
								))}
								{commandResult.signInHint ? (
									<CommandRow
										command={commandResult.signInHint}
										filtersText={null}
										note={t("signInToUse")}
										onSelect={() =>
											void runCommand({
												command: commandResult.signInHint as SearchCommand,
												filtersText: null,
												score: 0,
											})
										}
									/>
								) : null}
							</CommandGroup>
						) : null}
						{commandResult.hiddenCount > 0 ? (
							<p className="px-3 py-1 text-2xs text-muted-foreground">
								{t("moreHidden", { count: commandResult.hiddenCount })}
							</p>
						) : null}
						{isSearching ? (
							<GlobalSearchLoadingState />
						) : items.length > 0 ? (
							<CommandGroup heading={hasCommandRows ? t("results") : undefined}>
								{items.map((hit, index) => {
									const pages = innerPagesFor(hit.type);
									const page = pageFor(hit);
									return (
										<HitRow
											key={`${hit.type}-${hit.href}-${index}`}
											value={`hit-${index}`}
											hit={hit}
											page={page}
											chips={pages != null && highlighted === `hit-${index}`}
											pickedPage={page}
											onPick={(id) =>
												setPickedPages((existing) => ({
													...existing,
													[hit.href]: id,
												}))
											}
											onOpen={(chosen) => openHit(hit, chosen)}
										/>
									);
								})}
							</CommandGroup>
						) : null}
						{showEmpty ? (
							parsed.mode === "commands" ? (
								<GlobalSearchNoCommands query={parsed.text.trim()} />
							) : (
								<GlobalSearchNoResults query={parsed.term} />
							)
						) : null}
					</>
				)}
			</CommandList>
			<GlobalSearchFooter hasQuery={hasText} />
		</CommandDialog>
	);
}

function CommandRow({
	command,
	filtersText,
	note,
	onSelect,
}: {
	command: SearchCommand;
	filtersText: string | null;
	note?: string;
	onSelect: () => void;
}) {
	const t = useTranslations("shell.search");
	const locale = useLocale();
	const Icon = command.icon;
	const parsedFilters =
		filtersText != null ? parseCommandFilters(filtersText) : null;
	const description = parsedFilters
		? parsedFilters.ok
			? describeBookFilters(parsedFilters.filters, t, (code) =>
					getBookCountryName(code, locale),
				)
			: parsedFilters.error
		: (note ?? command.description);

	return (
		<CommandItem
			value={`cmd-${command.id}`}
			onSelect={onSelect}
			className={rowClassName}
		>
			<div
				className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted/35 text-muted-foreground"
				aria-hidden
			>
				<Icon className="size-4" />
			</div>
			<div className="min-w-0 flex-1 text-left">
				<p className="truncate font-medium text-foreground text-sm leading-snug">
					{command.label}
				</p>
				<p
					className={cn(
						"mt-0.5 truncate text-muted-foreground text-xs leading-snug",
						parsedFilters && !parsedFilters.ok && "text-destructive",
					)}
				>
					{description}
				</p>
			</div>
			<code className="hidden shrink-0 border border-border bg-background px-1 font-mono text-3xs text-muted-foreground sm:inline">
				{command.keyword}
			</code>
		</CommandItem>
	);
}

function HitRow({
	value,
	hit,
	page,
	chips,
	pickedPage,
	onPick,
	onOpen,
}: {
	value: string;
	hit: GlobalSearchHit;
	/** Inner page the next Enter opens; null means the overview. */
	page: InnerPage | null;
	/** Show the page chips (only the highlighted row does). */
	chips: boolean;
	pickedPage: InnerPage | null;
	onPick: (id: string | null) => void;
	onOpen: (page: InnerPage | null) => void;
}) {
	const t = useTranslations("shell.search");
	const pages = innerPagesFor(hit.type);

	return (
		<CommandItem
			value={value}
			onSelect={() => onOpen(page)}
			className={cn(rowClassName, "flex-col items-stretch gap-2")}
		>
			<div className="flex items-center gap-3">
				<GlobalSearchThumb hit={hit} />
				<div className="min-w-0 flex-1 text-left">
					<p className="truncate font-medium text-foreground text-sm leading-snug">
						{hit.title}
					</p>
					<p className="mt-0.5 truncate text-muted-foreground text-xs leading-snug">
						{hit.description}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					{hit.action ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							className="text-muted-foreground hover:text-foreground"
							aria-label={hit.action.label}
							onClick={(event) => {
								event.stopPropagation();
								window.open(hit.action?.href, "_blank", "noopener,noreferrer");
							}}
						>
							<ExternalLink className="size-3.5" aria-hidden />
						</Button>
					) : null}
					<Badge variant="outline" className="font-normal text-3xs">
						{t(`types.${hit.type}`)}
						{page ? ` · ${pageLabel(t, page)}` : ""}
					</Badge>
				</div>
			</div>
			{chips && pages ? (
				<InnerPageStrip
					pages={pages}
					selected={pickedPage}
					onPick={onPick}
					onOpen={onOpen}
				/>
			) : null}
		</CommandItem>
	);
}

/** One scrollable row of page shortcuts, shown only under the highlighted result. */
function InnerPageStrip({
	pages,
	selected,
	onPick,
	onOpen,
}: {
	pages: InnerPage[];
	selected: InnerPage | null;
	onPick: (id: string | null) => void;
	onOpen: (page: InnerPage | null) => void;
}) {
	const t = useTranslations("shell.search");
	return (
		<fieldset className="m-0 ms-12 flex min-w-0 items-center gap-1 overflow-x-auto border-0 p-0 pb-0.5 [scrollbar-width:none]">
			<legend className="sr-only">{t("openPage")}</legend>
			{selected == null ? (
				<span className="shrink-0 text-2xs text-muted-foreground">
					<kbd className="border border-border bg-background px-1 font-mono text-3xs">
						→
					</kbd>{" "}
					{t("pagesChip")}
				</span>
			) : null}
			{pages.map((page) => {
				const active = selected?.id === page.id;
				return (
					<button
						key={page.id}
						type="button"
						tabIndex={-1}
						aria-pressed={active}
						ref={(element) => {
							if (active && element) {
								element.scrollIntoView({ block: "nearest", inline: "nearest" });
							}
						}}
						className={cn(
							"shrink-0 border px-1.5 py-0.5 text-2xs transition-colors",
							active
								? "border-foreground bg-foreground text-background"
								: "border-border bg-background text-muted-foreground hover:text-foreground",
						)}
						onMouseDown={(event) => event.preventDefault()}
						onClick={(event) => {
							event.stopPropagation();
							onPick(page.id);
							onOpen(page);
						}}
					>
						{pageLabel(t, page)}
					</button>
				);
			})}
		</fieldset>
	);
}

function GlobalSearchIdleHints() {
	const t = useTranslations("shell.search");
	const code = (chunks: React.ReactNode) => (
		<code className="font-mono">{chunks}</code>
	);
	return (
		<div className="px-3 pt-3 pb-2">
			<ul className="space-y-1.5 border-border border-t pt-3 text-2xs text-muted-foreground">
				<li>
					{t.rich("idle.commands", {
						code,
						settings: "settings:",
						create: "create:",
						admin: "admin:",
					})}
				</li>
				<li>{t.rich("idle.symbols", { code, at: "@", gt: ">" })}</li>
				<li>{t.rich("idle.random", { code, example: "random:nr:p<400" })}</li>
			</ul>
		</div>
	);
}

function GlobalSearchMembersHint() {
	const t = useTranslations("shell.search");
	return (
		<div className="px-3 py-5">
			<p className="text-pretty text-muted-foreground text-sm leading-relaxed">
				{t("membersHint")}
			</p>
		</div>
	);
}

function GlobalSearchLoadingState() {
	const t = useTranslations("shell.search");
	return (
		<div
			className="space-y-1.5 px-1 py-1"
			role="status"
			aria-busy="true"
			aria-live="polite"
		>
			<span className="sr-only">{t("searching")}</span>
			{[0, 1, 2].map((key) => (
				<div
					key={key}
					className="flex items-center gap-3 border border-transparent px-2.5 py-2.5"
				>
					<Skeleton className="size-9 shrink-0" />
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-3.5 w-[min(100%,14rem)]" />
						<Skeleton className="h-3 w-[min(100%,20rem)]" />
					</div>
					<Skeleton className="h-5 w-14 shrink-0" />
				</div>
			))}
		</div>
	);
}

function GlobalSearchNoResults({ query }: { query: string }) {
	const t = useTranslations("shell.search");
	return (
		<div className="px-3 py-8 text-center">
			<p className="font-medium text-foreground text-sm">{t("noMatches")}</p>
			<p className="mt-1.5 text-pretty text-muted-foreground text-xs leading-relaxed">
				{t.rich("noMatchesBody", {
					query,
					hl: (chunks) => <span className="text-foreground">{chunks}</span>,
				})}
			</p>
		</div>
	);
}

function GlobalSearchNoCommands({ query }: { query: string }) {
	const t = useTranslations("shell.search");
	return (
		<div className="px-3 py-8 text-center">
			<p className="font-medium text-foreground text-sm">{t("noCommand")}</p>
			<p className="mt-1.5 text-pretty text-muted-foreground text-xs leading-relaxed">
				{t.rich("noCommandBody", {
					query,
					symbol: ">",
					hl: (chunks) => <span className="text-foreground">{chunks}</span>,
					code: (chunks) => <code className="font-mono">{chunks}</code>,
				})}
			</p>
		</div>
	);
}

function GlobalSearchFooter({ hasQuery }: { hasQuery: boolean }) {
	const t = useTranslations("shell.search");
	const kbd = "border border-border bg-background px-1 font-mono text-3xs";
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 border-border border-t bg-muted/20 px-3 py-2 text-2xs text-muted-foreground">
			<span>{hasQuery ? t("footerWithQuery") : t("footerIdle")}</span>
			<span className="hidden sm:inline">
				<kbd className={kbd}>↑↓</kbd> {t("keys.move")}{" "}
				<kbd className={kbd}>→</kbd> {t("keys.pages")}{" "}
				<kbd className={kbd}>↵</kbd> {t("keys.open")}{" "}
				<kbd className={kbd}>esc</kbd> {t("keys.close")}
			</span>
		</div>
	);
}
