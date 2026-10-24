import { UserSchema } from "@bbrc/schemas";
import type { z } from "zod";
import zod from "zod";
import {
	ShelfListItemSchema,
	ShelfMemberRefSchema,
	ShelfPermissionSchema,
} from "./shelf.schema";

const shelfRef = {
	ownerUsername: UserSchema.shape.username.optional(),
	shelfSlug: zod.string().min(3).max(60),
};

const PermissionsSchema = zod.array(ShelfPermissionSchema).max(20);

export const ShelfInvitationStatusSchema = zod.enum([
	"pending",
	"accepted",
	"rejected",
	"cancelled",
	"expired",
]);

export const OkSchema = zod.object({ ok: zod.literal(true) });

export const SearchInvitableInputSchema = zod.object({
	...shelfRef,
	query: zod.string().trim().min(1).max(60),
});

export const InvitableStateSchema = zod.enum([
	"available",
	"owner",
	"collaborator",
	"invited",
	"invites_off",
]);

export const SearchInvitableOutputSchema = zod.object({
	items: zod.array(
		ShelfMemberRefSchema.extend({ state: InvitableStateSchema }),
	),
});

export const InviteCollaboratorInputSchema = zod.object({
	...shelfRef,
	username: UserSchema.shape.username,
	permissions: PermissionsSchema.min(1),
});

export const InviteCollaboratorOutputSchema = zod.object({
	invitationId: zod.string(),
	token: zod.string(),
});

export const GetInvitationInputSchema = zod.object({
	token: zod.string().min(10).max(200),
});

export const GetInvitationOutputSchema = zod.object({
	id: zod.string(),
	status: ShelfInvitationStatusSchema,
	expiresAt: zod.coerce.date(),
	permissions: PermissionsSchema,
	shelf: ShelfListItemSchema,
	owner: ShelfMemberRefSchema,
	invitedBy: ShelfMemberRefSchema,
});

export const RespondToInvitationInputSchema = zod.object({
	invitationId: zod.string(),
	accept: zod.boolean(),
});

export const RespondToInvitationOutputSchema = zod.object({
	accepted: zod.boolean(),
	ownerUsername: UserSchema.shape.username,
	shelfSlug: zod.string(),
});

export const ListMyInvitationsOutputSchema = zod.object({
	items: zod.array(
		zod.object({
			id: zod.string(),
			token: zod.string(),
			createdAt: zod.coerce.date(),
			expiresAt: zod.coerce.date(),
			shelfTitle: zod.string(),
			shelfSlug: zod.string(),
			owner: ShelfMemberRefSchema,
			invitedBy: ShelfMemberRefSchema,
			permissionCount: zod.number().int(),
		}),
	),
});

export const CancelInvitationInputSchema = zod.object({
	invitationId: zod.string(),
});

export const ListCollaboratorsInputSchema = zod.object(shelfRef);

export const ListCollaboratorsOutputSchema = zod.object({
	owner: ShelfMemberRefSchema,
	viewer: zod.object({
		role: zod.enum(["owner", "collaborator", "visitor"]),
		permissions: zod.array(ShelfPermissionSchema),
	}),
	collaborators: zod.array(
		ShelfMemberRefSchema.extend({
			/** Empty unless the viewer manages collaborators or this is the viewer. */
			permissions: zod.array(ShelfPermissionSchema),
			joinedAt: zod.coerce.date(),
			invitedBy: ShelfMemberRefSchema.nullable(),
		}),
	),
	invitations: zod.array(
		zod.object({
			id: zod.string(),
			/** Only for people allowed to invite; the link works for the invitee only. */
			token: zod.string().nullable(),
			invitee: ShelfMemberRefSchema,
			invitedBy: ShelfMemberRefSchema,
			permissions: zod.array(ShelfPermissionSchema),
			createdAt: zod.coerce.date(),
			expiresAt: zod.coerce.date(),
		}),
	),
});

export const UpdateCollaboratorInputSchema = zod.object({
	...shelfRef,
	username: UserSchema.shape.username,
	permissions: PermissionsSchema.min(1),
});

export const RemoveCollaboratorInputSchema = zod.object({
	...shelfRef,
	username: UserSchema.shape.username,
});

export const LeaveShelfInputSchema = zod.object(shelfRef);

export const TransferShelfInputSchema = zod.object({
	ownerUsername: UserSchema.shape.username.optional(),
	shelfSlug: zod.string().min(3).max(60),
	username: UserSchema.shape.username,
});

export const TransferShelfOutputSchema = zod.object({
	ownerUsername: UserSchema.shape.username,
	shelfSlug: zod.string(),
});

export const ListShelfActivityInputSchema = zod.object({
	...shelfRef,
	cursor: zod.string().optional(),
	limit: zod.number().int().min(1).max(50).default(30),
});

export const ShelfActivityKindSchema = zod.enum([
	"book_added",
	"book_removed",
	"books_reordered",
	"notes_edited",
	"shelf_updated",
	"collaborator_joined",
	"collaborator_left",
	"collaborator_removed",
	"permissions_changed",
	"ownership_transferred",
]);

export const ListShelfActivityOutputSchema = zod.object({
	items: zod.array(
		zod.object({
			id: zod.string(),
			kind: ShelfActivityKindSchema,
			createdAt: zod.coerce.date(),
			actor: ShelfMemberRefSchema.nullable(),
			target: ShelfMemberRefSchema.nullable(),
			meta: zod.record(zod.string(), zod.unknown()).nullable(),
		}),
	),
	nextCursor: zod.string().nullable(),
});

export const ShelfInvitePreferenceSchema = zod.object({
	allowInvites: zod.boolean(),
});

export type GetInvitationOutput = z.infer<typeof GetInvitationOutputSchema>;
export type ListCollaboratorsOutput = z.infer<
	typeof ListCollaboratorsOutputSchema
>;
export type ListShelfActivityOutput = z.infer<
	typeof ListShelfActivityOutputSchema
>;
export type SearchInvitableOutput = z.infer<typeof SearchInvitableOutputSchema>;
export type ListMyInvitationsOutput = z.infer<
	typeof ListMyInvitationsOutputSchema
>;
