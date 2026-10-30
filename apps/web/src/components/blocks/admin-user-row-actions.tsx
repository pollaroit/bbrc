"use client";

import type { AdminUserListItemSchema } from "@bbrc/api/modules/admin/admin-user.schema";
import { UserStatusSchema } from "@bbrc/schemas";
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
import { DestructiveConfirmDialog } from "@/components/destructive-confirm-dialog";
import { orpc, queryClient } from "@/utils/orpc";

type AdminUserRow = z.infer<typeof AdminUserListItemSchema>;

type DialogKind = "name" | "password" | "role" | "status" | "delete" | null;

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
	const [isAdmin, setIsAdmin] = useState(user.isAdmin);
	const [status, setStatus] = useState(user.status);

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
		orpc.admin.updateUserRole.mutationOptions({
			onSuccess: async () => {
				toast.success("Role updated.");
				setDialog(null);
				await invalidateAdminUsers();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	const updateStatus = useMutation(
		orpc.admin.updateUserStatus.mutationOptions({
			onSuccess: async () => {
				toast.success("Status updated.");
				setDialog(null);
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
		setIsAdmin(user.isAdmin);
		setStatus(user.status);
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
					<DropdownMenuItem onClick={() => openDialog("role")}>
						Update role
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => openDialog("status")}>
						Update status
					</DropdownMenuItem>
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
					</Field>
					<DialogFooter>
						<LoadingButton
							loading={setUserPassword.isPending}
							disabled={password.length < 7}
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
						<DialogTitle>Update role</DialogTitle>
						<DialogDescription>@{user.username}</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel>Role</FieldLabel>
						<Select
							value={isAdmin ? "admin" : "member"}
							onValueChange={(value) => {
								setIsAdmin(value === "admin");
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="member">Member</SelectItem>
								<SelectItem value="admin">Administrator</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					<DialogFooter>
						<LoadingButton
							loading={updateRole.isPending}
							onClick={() => {
								updateRole.mutate({
									username: user.username,
									isAdmin,
								});
							}}
						>
							Save role
						</LoadingButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={dialog === "status"}
				onOpenChange={(open) => {
					if (!open) setDialog(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Update status</DialogTitle>
						<DialogDescription>
							Status controls club access. Banned members cannot post or join
							sittings.
						</DialogDescription>
					</DialogHeader>
					<Field>
						<FieldLabel>Status</FieldLabel>
						<Select
							value={status}
							onValueChange={(value) => {
								if (value) {
									setStatus(UserStatusSchema.parse(value));
								}
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{UserStatusSchema.options.map((option) => (
									<SelectItem key={option} value={option}>
										{option}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Field>
					<DialogFooter>
						<LoadingButton
							loading={updateStatus.isPending}
							onClick={() => {
								updateStatus.mutate({
									username: user.username,
									status,
								});
							}}
						>
							Save status
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
