"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders children on document.body so `position: fixed` chrome stays viewport-
 * anchored (e.g. outside PwaPullToRefresh's transformed wrapper).
 */
export function BodyPortal({ children }: { children: ReactNode }) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	return createPortal(children, document.body);
}
