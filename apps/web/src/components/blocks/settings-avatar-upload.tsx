"use client";

import { useRouter } from "next/navigation";
import { SingleImageUploadField } from "@/components/blocks/single-image-upload-field";
import { authClient } from "@/lib/auth-client";
import { refreshAuthSession } from "@/lib/refresh-auth-session";
import { orpc } from "@/utils/orpc";

export function SettingsAvatarUpload() {
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const image = session?.user.image ?? null;

	return (
		<SingleImageUploadField
			label="Profile photo"
			description="Replaces your current avatar. JPEG is stored at a fixed path; PNG and WebP are accepted on upload."
			currentUrl={image}
			uploadTarget={{ target: "avatar" }}
			onRemove={async () => {
				await orpc.storage.clearAvatarUpload.call();
			}}
			onSuccess={async (publicUrl) => {
				await refreshAuthSession({
					imageUrl: publicUrl || null,
				});
				router.refresh();
			}}
		/>
	);
}
