"use client";

import type { GlobalSearchHitType } from "@bbrc/api/modules/search/global-search.schema";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { GlobalSearchDialog } from "@/components/blocks/global-search-dialog";

type GlobalSearchContextValue = {
	openSearch: () => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(
	null,
);

export function useGlobalSearch(): GlobalSearchContextValue {
	const value = useContext(GlobalSearchContext);
	if (!value) {
		throw new Error("useGlobalSearch must be used within GlobalSearchProvider");
	}
	return value;
}

export const globalSearchTypeLabels: Record<GlobalSearchHitType, string> = {
	book: "Book",
	user: "Member",
	post: "Post",
	feedback: "Review",
	comment: "Comment",
	shelf: "Shelf",
	document: "Document",
	author: "Author",
	goal: "Goal",
	series: "Series",
};

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);

	const openSearch = useCallback(() => {
		setOpen(true);
	}, []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key.toLowerCase() !== "k") {
				return;
			}

			if (!(event.metaKey || event.ctrlKey)) {
				return;
			}

			const target = event.target;
			if (
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.tagName === "SELECT")
			) {
				return;
			}

			event.preventDefault();
			setOpen((current) => !current);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	const value = useMemo(() => ({ openSearch }), [openSearch]);

	return (
		<GlobalSearchContext value={value}>
			{children}
			<GlobalSearchDialog open={open} onOpenChange={setOpen} />
		</GlobalSearchContext>
	);
}
