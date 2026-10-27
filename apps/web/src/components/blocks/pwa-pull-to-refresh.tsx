"use client";

import { cn } from "@bbrc/ui/lib/utils";
import { Loader2 } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

import { isOverlayOpen } from "@/lib/pwa/is-overlay-open";
import { isStandalonePwa } from "@/lib/pwa/is-standalone";
import { isTouchChainAtScrollTop } from "@/lib/pwa/scroll-at-top";

const PULL_START = 12;
const PULL_THRESHOLD = 72;
const PULL_MAX = 120;

type PullPhase = "idle" | "pulling" | "refreshing";

export function PwaPullToRefresh({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const pathnameRef = useRef(pathname);
	pathnameRef.current = pathname;

	const [enabled, setEnabled] = useState(false);
	const [phase, setPhase] = useState<PullPhase>("idle");
	const phaseRef = useRef<PullPhase>("idle");
	const [pullDistance, setPullDistance] = useState(0);
	const pullDistanceRef = useRef(0);
	const touchStartY = useRef<number | null>(null);
	const touchTargetRef = useRef<EventTarget | null>(null);
	const pulling = useRef(false);
	const reducedMotion = useRef(false);

	const setPhaseSafe = useCallback((next: PullPhase) => {
		phaseRef.current = next;
		setPhase(next);
	}, []);

	useEffect(() => {
		setEnabled(isStandalonePwa());
		reducedMotion.current = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
	}, []);

	const resetPull = useCallback(() => {
		touchStartY.current = null;
		touchTargetRef.current = null;
		pulling.current = false;
		pullDistanceRef.current = 0;
		setPullDistance(0);
		if (phaseRef.current !== "refreshing") {
			setPhaseSafe("idle");
		}
	}, [setPhaseSafe]);

	const runRefresh = useCallback(() => {
		setPhaseSafe("refreshing");
		pullDistanceRef.current = PULL_THRESHOLD;
		setPullDistance(PULL_THRESHOLD);
		router.refresh();
		window.setTimeout(() => {
			setPhaseSafe("idle");
			pullDistanceRef.current = 0;
			setPullDistance(0);
		}, 600);
	}, [router, setPhaseSafe]);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		const onTouchStart = (event: TouchEvent) => {
			if (pathnameRef.current.startsWith("/reels")) {
				return;
			}
			if (isOverlayOpen()) {
				return;
			}
			if (phaseRef.current === "refreshing") {
				return;
			}
			if (!isTouchChainAtScrollTop(event.target)) {
				return;
			}
			const touch = event.touches[0];
			if (!touch) {
				return;
			}
			touchStartY.current = touch.clientY;
			touchTargetRef.current = event.target;
			pulling.current = true;
		};

		const onTouchMove = (event: TouchEvent) => {
			if (pathnameRef.current.startsWith("/reels")) {
				return;
			}
			if (isOverlayOpen()) {
				resetPull();
				return;
			}
			if (!pulling.current || touchStartY.current === null) {
				return;
			}
			if (!isTouchChainAtScrollTop(touchTargetRef.current)) {
				resetPull();
				return;
			}
			const touch = event.touches[0];
			if (!touch) {
				return;
			}
			const delta = touch.clientY - touchStartY.current;
			if (delta <= PULL_START) {
				pullDistanceRef.current = 0;
				setPullDistance(0);
				setPhaseSafe("idle");
				return;
			}
			event.preventDefault();
			const distance = Math.min(delta, PULL_MAX);
			pullDistanceRef.current = distance;
			setPullDistance(distance);
			setPhaseSafe("pulling");
		};

		const onTouchEnd = () => {
			if (!pulling.current) {
				return;
			}
			if (pullDistanceRef.current >= PULL_THRESHOLD) {
				runRefresh();
			} else {
				resetPull();
			}
		};

		window.addEventListener("touchstart", onTouchStart, { passive: true });
		window.addEventListener("touchmove", onTouchMove, { passive: false });
		window.addEventListener("touchend", onTouchEnd);
		window.addEventListener("touchcancel", resetPull);

		return () => {
			window.removeEventListener("touchstart", onTouchStart);
			window.removeEventListener("touchmove", onTouchMove);
			window.removeEventListener("touchend", onTouchEnd);
			window.removeEventListener("touchcancel", resetPull);
		};
	}, [enabled, resetPull, runRefresh, setPhaseSafe]);

	useEffect(() => {
		if (pathname.startsWith("/reels")) {
			resetPull();
		}
	}, [pathname, resetPull]);

	if (!enabled) {
		return children;
	}

	const showIndicator = phase !== "idle" || pullDistance > 0;
	const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
	const translateY = reducedMotion.current
		? phase === "refreshing"
			? 24
			: 0
		: pullDistance * 0.35;

	return (
		<div className="relative min-h-dvh">
			<div
				className={cn(
					"pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center pt-[max(0.5rem,env(safe-area-inset-top))] transition-opacity duration-150",
					showIndicator ? "opacity-100" : "opacity-0",
				)}
				style={{ top: "var(--pwa-vv-top, 0px)" }}
				aria-hidden={!showIndicator}
			>
				<div className="flex size-10 items-center justify-center border border-border bg-background shadow-sm">
					<Loader2
						className={cn(
							"size-5 text-primary",
							phase === "refreshing" || progress >= 1 ? "animate-spin" : "",
						)}
						style={
							phase === "pulling" && progress < 1
								? { transform: `rotate(${progress * 320}deg)` }
								: undefined
						}
					/>
				</div>
			</div>
			<div
				className={cn(
					"min-h-dvh transition-transform duration-150 ease-out",
					phase === "refreshing" && "duration-300",
				)}
				style={{ transform: `translateY(${translateY}px)` }}
			>
				{children}
			</div>
		</div>
	);
}
