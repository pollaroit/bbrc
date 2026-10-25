"use client";

import type { MentionCandidate } from "@bbrc/api/modules/mention/mention.schema";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { MentionPick, MentionPickerRequest } from "@/lib/tiptap-mention";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

/*
 * The popup that opens when someone types "@" (or clicks a mention). Five people
 * at most; with nothing typed it shows smart suggestions (people in the thread,
 * people you mention often, people active lately). Arrow keys and Enter/Tab pick,
 * Esc closes. It sits next to the caret and moves above it when there is no room
 * below (small screens, on-screen keyboard).
 */

const REASON_COPY: Record<MentionCandidate["reason"], string | null> = {
	thread: "In this conversation",
	recent: "You mention them often",
	active: "Active lately",
	match: null,
};

const POPUP_WIDTH = 288;
const POPUP_HEIGHT = 284;

type Position = { left: number; top: number; above: boolean };

function placeNear(rect: DOMRect | null): Position | null {
	if (!rect) return null;
	const viewport = window.visualViewport;
	const viewWidth = viewport?.width ?? window.innerWidth;
	const viewHeight = viewport?.height ?? window.innerHeight;
	const offsetLeft = viewport?.offsetLeft ?? 0;
	const offsetTop = viewport?.offsetTop ?? 0;

	const left = Math.min(
		Math.max(offsetLeft + 8, rect.left),
		offsetLeft + viewWidth - POPUP_WIDTH - 8,
	);
	const roomBelow = offsetTop + viewHeight - rect.bottom;
	const above = roomBelow < POPUP_HEIGHT && rect.top - offsetTop > roomBelow;
	return {
		left: Math.max(offsetLeft + 8, left),
		top: above ? rect.top - 6 : rect.bottom + 6,
		above,
	};
}

export function MentionPicker({
	request,
	keyHandlerRef,
	context,
}: {
	request: MentionPickerRequest | null;
	keyHandlerRef: { current: ((event: KeyboardEvent) => boolean) | null };
	context?: { postSlug?: string; feedbackSlug?: string };
}) {
	const [typed, setTyped] = useState("");
	const [active, setActive] = useState(0);
	const [position, setPosition] = useState<Position | null>(null);
	const listId = useId();
	const inputRef = useRef<HTMLInputElement>(null);

	const mode = request?.mode;
	const rawQuery = mode === "replace" ? typed : (request?.query ?? "");
	const query = useDebouncedValue(rawQuery.trim(), 140);

	const search = useQuery({
		...orpc.mention.search.queryOptions({
			input: {
				query,
				...(context && (context.postSlug || context.feedbackSlug)
					? { context }
					: {}),
			},
		}),
		enabled: request != null,
		staleTime: 30_000,
		retry: false,
		placeholderData: keepPreviousData,
	});
	const items = useMemo(() => search.data?.items ?? [], [search.data]);

	// A new popup starts clean.
	useEffect(() => {
		if (request) {
			setActive(0);
			if (request.mode === "replace") setTyped("");
		}
	}, [request]);

	useEffect(() => {
		setActive(0);
	}, [query]);

	// Anchor to the caret (or the clicked mention) and follow it.
	useLayoutEffect(() => {
		if (!request) {
			setPosition(null);
			return;
		}
		const update = () => setPosition(placeNear(request.clientRect()));
		update();
		window.addEventListener("scroll", update, true);
		window.addEventListener("resize", update);
		window.visualViewport?.addEventListener("resize", update);
		window.visualViewport?.addEventListener("scroll", update);
		return () => {
			window.removeEventListener("scroll", update, true);
			window.removeEventListener("resize", update);
			window.visualViewport?.removeEventListener("resize", update);
			window.visualViewport?.removeEventListener("scroll", update);
		};
	}, [request]);

	useEffect(() => {
		if (request?.mode === "replace") inputRef.current?.focus();
	}, [request]);

	function pick(candidate: MentionCandidate | undefined) {
		if (!candidate || !request) return;
		const result: MentionPick = {
			id: candidate.id,
			username: candidate.username,
			name: candidate.name,
		};
		request.onPick(result);
	}

	const handleKey = (event: KeyboardEvent): boolean => {
		if (!request) return false;
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			if (items.length === 0) return true;
			setActive((index) =>
				event.key === "ArrowDown"
					? (index + 1) % items.length
					: (index - 1 + items.length) % items.length,
			);
			return true;
		}
		if (event.key === "Home" || event.key === "End") {
			if (mode === "replace" || items.length === 0) return false;
			setActive(event.key === "Home" ? 0 : items.length - 1);
			return true;
		}
		if (event.key === "Enter" || event.key === "Tab") {
			// While the list is still loading, Enter must not fall through to a new line.
			if (search.isPending) return true;
			const candidate = items[active];
			if (!candidate) return false;
			pick(candidate);
			return true;
		}
		if (event.key === "Escape") {
			request.onClose();
			return false;
		}
		return false;
	};
	const handleKeyRef = useRef(handleKey);
	handleKeyRef.current = handleKey;

	// Keep the highlighted row visible while arrowing through a long list.
	useEffect(() => {
		if (!request) return;
		document
			.getElementById(`${listId}-${active}`)
			?.scrollIntoView({ block: "nearest" });
	}, [active, request, listId]);

	useEffect(() => {
		if (!request) return;
		keyHandlerRef.current = (event) => handleKeyRef.current(event);
		return () => {
			keyHandlerRef.current = null;
		};
	}, [request, keyHandlerRef]);

	if (!request || !position || typeof document === "undefined") return null;

	const showSkeleton = search.isPending;

	return createPortal(
		// biome-ignore lint/a11y/noStaticElementInteractions: a mouse pick must not take focus away from the editor
		<div
			// Mouse picks must not steal focus from the editor.
			onMouseDown={(event) => {
				if ((event.target as HTMLElement).tagName !== "INPUT") {
					event.preventDefault();
				}
			}}
			style={{
				position: "fixed",
				left: position.left,
				top: position.top,
				width: POPUP_WIDTH,
				transform: position.above ? "translateY(-100%)" : undefined,
			}}
			className="z-[100] flex flex-col overflow-hidden bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
		>
			{mode === "replace" ? (
				<div className="border-border border-b p-2">
					<input
						ref={inputRef}
						value={typed}
						onChange={(event) => setTyped(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Escape") {
								event.preventDefault();
								request.onClose();
								return;
							}
							if (handleKey(event.nativeEvent)) event.preventDefault();
						}}
						placeholder="Change who is mentioned…"
						aria-label="Search members"
						aria-controls={listId}
						autoComplete="off"
						className="h-9 w-full border border-input bg-background px-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
					/>
				</div>
			) : null}
			<div
				id={listId}
				role="listbox"
				tabIndex={-1}
				aria-label="Members you can mention"
				className="flex max-h-[15rem] flex-col overflow-y-auto py-1"
			>
				{showSkeleton ? (
					Array.from({ length: 3 }, (_, index) => (
						<div key={index} className="flex items-center gap-2 px-2.5 py-2">
							<Skeleton className="size-7 shrink-0 rounded-full" />
							<span className="flex flex-1 flex-col gap-1">
								<Skeleton className="h-3 w-24" />
								<Skeleton className="h-2.5 w-16" />
							</span>
						</div>
					))
				) : items.length === 0 ? (
					<p className="px-3 py-3 text-muted-foreground text-sm">
						{search.isError
							? "Could not load members. Keep typing to try again."
							: "No members match."}
					</p>
				) : (
					items.map((candidate, index) => {
						const reason = rawQuery.trim()
							? null
							: REASON_COPY[candidate.reason];
						return (
							<div
								key={candidate.id}
								id={`${listId}-${index}`}
								role="option"
								tabIndex={-1}
								aria-selected={index === active}
								onMouseMove={() => setActive(index)}
								onClick={() => pick(candidate)}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										pick(candidate);
									}
								}}
								className={cn(
									"flex w-full cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-start transition-colors",
									index === active ? "bg-muted" : "hover:bg-muted/60",
								)}
							>
								<UserAvatar
									user={{ name: candidate.name, image: candidate.image }}
									className="size-7 shrink-0"
								/>
								<span className="flex min-w-0 flex-1 flex-col">
									<span className="truncate font-medium text-sm leading-tight">
										{candidate.name}
									</span>
									<span className="truncate text-muted-foreground text-xs">
										@{candidate.username}
										{reason ? ` · ${reason}` : ""}
									</span>
								</span>
							</div>
						);
					})
				)}
			</div>
			<p className="sr-only" aria-live="polite">
				{items.length} {items.length === 1 ? "member" : "members"} found
			</p>
		</div>,
		document.body,
	);
}
