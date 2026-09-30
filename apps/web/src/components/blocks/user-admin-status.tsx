"use client";

import type { GetUserByUsernameOutput } from "@bbrc/api/modules/user/user.schema";
import { UserStatusSchema } from "@bbrc/schemas";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

type UserAdminStatusProps = {
	user: GetUserByUsernameOutput;
};

export function UserAdminStatus({ user }: UserAdminStatusProps) {
	const router = useRouter();
	const { data: session, isPending } = authClient.useSession();

	const mutation = useMutation(
		orpc.user.updateUserStatus.mutationOptions({
			onSuccess: async () => {
				toast.success("Member status updated");
				await queryClient.invalidateQueries({
					queryKey: orpc.user.getUserByUsername.key(),
				});
				await queryClient.invalidateQueries({
					queryKey: orpc.user.getUserList.key(),
				});
				router.refresh();
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (isPending || !session?.user.isAdmin) {
		return null;
	}

	return (
		<div className="flex max-w-xs flex-col gap-1.5">
			<p className="font-medium text-sm">Admin: member status</p>
			<Select
				value={user.status}
				onValueChange={(next) => {
					if (next == null || next === user.status) {
						return;
					}
					mutation.mutate({
						username: user.username,
						status: UserStatusSchema.parse(next),
					});
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
			<p className="text-muted-foreground text-xs">
				Use this to restore banned members to active. Status also changes
				automatically when sittings finish.
			</p>
		</div>
	);
}
