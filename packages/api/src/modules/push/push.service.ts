import type { Database } from "@bbrc/db";
import { buildPushPayload, describeDevice } from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import { resolvePublicAppOrigin } from "../../lib/public-origin";
import { pushToMembers } from "../../lib/push/delivery";
import { getAblyRest } from "../../lib/realtime/ably";
import { realtimeClientId } from "../../lib/realtime/client-id";
import type { PushDeviceView, RegisterPushDeviceInput } from "./push.schema";

function requireAbly() {
	const rest = getAblyRest();
	if (!rest) {
		throw new ORPCError("PRECONDITION_FAILED", {
			message: "Push notifications are not set up on this server yet.",
		});
	}
	return rest;
}

/**
 * Records a device the browser has just registered with Ably. The browser says
 * which device it is and proves it with the device's secret; the server then
 * ties that device to this member's id at Ably, which is what pushes are sent to.
 * Nobody can claim a device without its secret.
 */
export async function registerPushDevice(
	db: Database,
	userId: string,
	input: RegisterPushDeviceInput,
): Promise<{ ok: true }> {
	const rest = requireAbly();
	const clientId = realtimeClientId(userId);

	let registration: Awaited<
		ReturnType<typeof rest.push.admin.deviceRegistrations.get>
	>;
	try {
		registration = await rest.push.admin.deviceRegistrations.get(
			input.deviceId,
		);
	} catch {
		throw new ORPCError("NOT_FOUND", {
			message: "That device is not registered for push yet.",
		});
	}
	if (!clientId) {
		throw new ORPCError("FORBIDDEN", {
			message: "That device is registered to someone else.",
		});
	}
	// Ably does not record who a browser device belongs to, so the server does.
	// Only the browser that registered the device knows its secret: that is the proof.
	const secretMatches =
		typeof registration.deviceSecret === "string" &&
		registration.deviceSecret === input.deviceSecret;
	const ownedByOther =
		registration.clientId != null && registration.clientId !== clientId;
	if (!secretMatches || ownedByOther) {
		throw new ORPCError("FORBIDDEN", {
			message: "That device is registered to someone else.",
		});
	}
	if (registration.clientId !== clientId) {
		// Only the writable fields: Ably refuses `push.state`, `push.error` and the like.
		await rest.push.admin.deviceRegistrations.save({
			id: registration.id,
			platform: registration.platform,
			formFactor: registration.formFactor,
			clientId,
			push: { recipient: registration.push?.recipient },
		} as Parameters<typeof rest.push.admin.deviceRegistrations.save>[0]);
	}

	const label = describeDevice(input.userAgent);
	await db.pushDevice.upsert({
		where: { deviceId: input.deviceId },
		// A browser that switched accounts moves to the new member.
		update: { userId, label, lastSeenAt: new Date() },
		create: { userId, deviceId: input.deviceId, label },
	});
	return { ok: true };
}

export async function listPushDevices(
	db: Database,
	userId: string,
): Promise<{ devices: PushDeviceView[] }> {
	const devices = await db.pushDevice.findMany({
		where: { userId },
		orderBy: { createdAt: "asc" },
		select: { deviceId: true, label: true, createdAt: true, lastSeenAt: true },
	});
	return { devices };
}

/** Stops pushes to one of the member's devices (and forgets it). */
export async function removePushDevice(
	db: Database,
	userId: string,
	deviceId: string,
): Promise<{ ok: true }> {
	const device = await db.pushDevice.findFirst({
		where: { deviceId, userId },
		select: { id: true },
	});
	if (device) {
		try {
			await getAblyRest()?.push.admin.deviceRegistrations.remove(deviceId);
		} catch {
			// Already gone at Ably: forgetting it here is what matters.
		}
		await db.pushDevice.delete({ where: { id: device.id } });
	}
	return { ok: true };
}

/** A push to all of the member's devices, to check it works. */
export async function sendTestPush(
	db: Database,
	userId: string,
): Promise<{ devices: number }> {
	requireAbly();
	const devices = await db.pushDevice.count({ where: { userId } });
	if (devices === 0) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Turn on push on this device first.",
		});
	}
	await pushToMembers([
		{
			userId,
			payload: buildPushPayload(
				{
					notificationId: crypto.randomUUID(),
					kind: "test",
					title: "Push is working",
					body: "This is a test notification from BBRC.",
					href: "/settings/notifications",
				},
				resolvePublicAppOrigin(),
			),
		},
	]);
	return { devices };
}
