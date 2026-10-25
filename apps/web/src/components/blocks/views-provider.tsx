"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { noteNavigation } from "@/lib/views/tracker";

/**
 * Remembers the page the member was on before, so a view can say where it came
 * from. A layout effect runs before the new page's own effects read it.
 */
export function ViewsProvider({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	useLayoutEffect(() => {
		noteNavigation(pathname);
	}, [pathname]);

	return children;
}
