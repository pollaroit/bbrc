"use client";

import type { AdminUserListItemSchema } from "@bbrc/api/modules/admin/admin-user.schema";
import { passwordSchema } from "@bbrc/schemas";
import { assignableRoles, ROLE_META, type Role, roleOf } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { useMutation } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { PasswordRequirements } from "@/components/blocks/password-requirements";
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

type AdminUserRow = z.infer<typeof AdminUserListItemSchema>;

type DialogKind = "name" | "password" | "role" | "delete" | null;

async function invalidateAdminUsers() {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: orpc.admin.listUsers.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.admin.getUserStats.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.admin.getUserOverview.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.user.getUserList.key(),
		}),
		queryClient.invalidateQueries({
			queryKey: orpc.user.getUserByUsername.key(),
		}),
	]);
}

export function AdminUserRowActions({ user }: { user: AdminUserRow }) {
	const [dialog, setDialog] = useState<DialogKind>(null);
	const [name, setName] = useState(user.name);
	const [password, setPassword] = useState("");
	const { data: session } = authClient.useSession();
	// The roles the signed-in person may give this member: the same rules the server enforces.
	const offeredRoles = session?.user ? assignableRoles(session.user, user) : [];
	const [role, setRole] = useState<Role | null>(offeredRoles[0] ?? null);

	const updateName = useMutation(
		orpc.admin.updateUserName.mutationOptions({
			onSuccess: async () => {
				toast.success("Name updated.");
				setDialog(null);
				await invalidateAdminUsers();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateRole = useMutation(
		orpc.role.set.mutationOptions({
			onSuccess: async () => {
				toast.success("Role updated.");
				setDialog(null);
				await invalidateAdminUsers();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const verifyUserEmail = useMutation(
		orpc.admin.verifyUserEmail.mutationOptions({
			onSuccess: async () => {
				toast.success("Email marked as verified.");
				await invalidateAdminUsers();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const setUserPassword = useMutation(
		orpc.admin.setUserPassword.mutationOptions({
			onSuccess: async () => {
				toast.success("Password updated.");
				setPassword("");
				setDialog(null);
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const deleteUser = useMutation(
		orpc.admin.deleteUser.mutationOptions({
			onSuccess: async () => {
				toast.success("Member deleted.");
				setDialog(null);
				await invalidateAdminUsers();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const openDialog = (kind: DialogKind) => {
		setName(user.name);
		setRole(offeredRoles[0] ?? null);
		setPassword("");
		setDialog(kind);
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Member actions"
						/>
					}
				>
					<MoreHorizontal className="size-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						render={
							<Link href={`/users/${user.username}` as Route} target="_blank" />
						}
					>
						View profile
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => openDialog("name")}>
						Edit name
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => openDialog("password")}>
						Set password
					</DropdownMenuItem>
					{!user.emailVerified ? (
						<DropdownMenuItem
							onClick={() => {
								verifyUserEmail.mutate({ username: user.username });
							}}
						>
							Mark email verified
						</DropdownMenuItem>
					) : null}
					{offeredRoles.length > 0 ? (
						<DropdownMenuItem onClick={() => openDialog("role")}>
							Change role
						</DropdownMenuItem>
					) : null}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						onClick={() => openDialog("delete")}
					>
						Delete member
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog
				open={dialog === "name"}
				onOpenChange={(open) => {
					if (!open) setDialog(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit name</DialogTitle>
						<DialogDescription>
							@{user.username}, {user.email}
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel htmlFor={`name-${user.id}`}>Display name</FieldLabel>
						<Input
							id={`name-${user.id}`}
							value={name}
							onChange={(event) => setName(event.target.value)}
							maxLength={30}
						/>
					</Field>
					<DialogFooter>
						<LoadingButton
							loading={updateName.isPending}
							disabled={name.trim().length < 3}
							onClick={() => {
								updateName.mutate({
									username: user.username,
									name: name.trim(),
								});
							}}
						>
							Save
						</LoadingButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={dialog === "password"}
				onOpenChange={(open) => {
					if (!open) setDialog(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Set password</DialogTitle>
						<DialogDescription>
							Replace the sign-in password for @{user.username}. Share it with
							them directly.
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel htmlFor={`password-${user.id}`}>
							New password
						</FieldLabel>
						<Input
							id={`password-${user.id}`}
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							autoComplete="new-password"
						/>
						<PasswordRequirements />
					</Field>
					<DialogFooter>
						<LoadingButton
							loading={setUserPassword.isPending}
							disabled={!passwordSchema.safeParse(password).success}
							onClick={() => {
								setUserPassword.mutate({
									username: user.username,
									password,
								});
							}}
						>
							Update password
						</LoadingButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={dialog === "role"}
				onOpenChange={(open) => {
					if (!open) setDialog(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change role</DialogTitle>
						<DialogDescription>
							@{user.username} is now{" "}
							{ROLE_META[roleOf(user)].label.toLowerCase()}.
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel>New role</FieldLabel>
						<Select
							value={role ?? ""}
							onValueChange={(value) => setRole(value as Role)}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Choose a role" />
							</SelectTrigger>
							<SelectContent>
								{offeredRoles.map((offered) => (
									<SelectItem key={offered} value={offered}>
										{ROLE_META[offered].label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{role ? (
							<p className="text-muted-foreground text-xs">
								{ROLE_META[role].description}
							</p>
						) : null}
					</Field>
					<DialogFooter>
						<LoadingButton
							loading={updateRole.isPending}
							disabled={role == null}
							onClick={() => {
								if (!role) return;
								updateRole.mutate({ username: user.username, role });
							}}
						>
							Save role
						</LoadingButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<DestructiveConfirmDialog
				open={dialog === "delete"}
				onOpenChange={(open) => {
					if (!open) setDialog(null);
				}}
				title="Delete member?"
				description={
					<>
						This permanently removes <strong>@{user.username}</strong> and their
						posts, comments, and activity. This cannot be undone.
					</>
				}
				confirmLabel="Delete member"
				loading={deleteUser.isPending}
				onConfirm={() => {
					deleteUser.mutate({ username: user.username });
				}}
			/>
		</>
	);
}
