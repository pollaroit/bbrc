"use client";

import type { MentionProfile } from "@bbrc/api/modules/mention/mention.schema";
import { useEffect, useSyncExternalStore } from "react";
import { client } from "@/utils/orpc";

/*
 * The CURRENT name, username and photo of members that were mentioned, for the
 * whole page: every mention that shows up asks `mention.resolve` once, together
 * (one request per ~16 ms of rendering, up to 60 ids), and the answers are kept
 * for the session. A member that no longer exists is "missing" and the mention
 * then reads as ordinary text.
 */

export type MentionProfileState =
	| { status: "loading" }
	| { status: "ok"; profile: MentionProfile }
	| { status: "missing" };

const LOADING: MentionProfileState = { status: "loading" };
const MISSING: MentionProfileState = { status: "missing" };
const BATCH = 60;

const cache = new Map<string, MentionProfileState>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function emit() {
	for (const listener of listeners) listener();
}

async function flush() {
	timer = null;
	const ids = [...pending];
	pending.clear();
	for (let index = 0; index < ids.length; index += BATCH) {
		const slice = ids.slice(index, index + BATCH);
		try {
			const { profiles } = await client.mention.resolve({ ids: slice });
			const found = new Map(profiles.map((profile) => [profile.id, profile]));
			for (const id of slice) {
				const profile = found.get(id);
				cache.set(id, profile ? { status: "ok", profile } : MISSING);
			}
		} catch {
			// Not answered (offline, not built yet): show the saved name and let a later render ask again.
			for (const id of slice) cache.delete(id);
		}
	}
	emit();
}

function request(id: string) {
	if (cache.has(id) || pending.has(id)) return;
	pending.add(id);
	cache.set(id, LOADING);
	if (!timer) timer = setTimeout(() => void flush(), 16);
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The member's current profile (or "loading" / "missing"); `null` id = old username-only mention. */
export function useMentionProfile(
	userId: string | null | undefined,
): MentionProfileState {
	const snapshot = useSyncExternalStore(
		subscribe,
		() => (userId ? (cache.get(userId) ?? LOADING) : LOADING),
		() => LOADING,
	);
	useEffect(() => {
		if (userId) request(userId);
	}, [userId]);
	return snapshot;
}
