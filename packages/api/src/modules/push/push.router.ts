import { notBannedProcedure } from "../../procedures";
import {
	ListPushDevicesOutputSchema,
	OkSchema,
	RegisterPushDeviceInputSchema,
	RemovePushDeviceInputSchema,
	SendTestPushOutputSchema,
} from "./push.schema";
import {
	listPushDevices,
	registerPushDevice,
	removePushDevice,
	sendTestPush,
} from "./push.service";

export const pushRouter = {
	registerDevice: notBannedProcedure
		.input(RegisterPushDeviceInputSchema)
		.output(OkSchema)
		.handler(({ input, context }) =>
			registerPushDevice(context.db, context.session.user.id, input),
		),
	listDevices: notBannedProcedure
		.output(ListPushDevicesOutputSchema)
		.handler(({ context }) =>
			listPushDevices(context.db, context.session.user.id),
		),
	removeDevice: notBannedProcedure
		.input(RemovePushDeviceInputSchema)
		.output(OkSchema)
		.handler(({ input, context }) =>
			removePushDevice(context.db, context.session.user.id, input.deviceId),
		),
	sendTest: notBannedProcedure
		.output(SendTestPushOutputSchema)
		.handler(({ context }) =>
			sendTestPush(context.db, context.session.user.id),
		),
};
