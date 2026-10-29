import { deactivatePush, localPushDeviceId } from "@/lib/push/client";
import { client } from "@/utils/orpc";

/**
 * Stops this browser receiving the member's pushes. Call it just before signing
 * out, while the session can still prove who the device belongs to. Never throws:
 * signing out must not wait on, or fail because of, push.
 */
export async function releasePushOnSignOut(): Promise<void> {
	try {
		const deviceId = localPushDeviceId();
		if (!deviceId) return;
		await client.push.removeDevice({ deviceId });
		await deactivatePush();
	} catch {
		// Best effort.
	}
}
