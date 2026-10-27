"use client";

import { useTranslations } from "next-intl";
import { SingleImageUploadField } from "@/components/blocks/single-image-upload-field";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { refreshAuthSession } from "@/lib/refresh-auth-session";
import { orpc } from "@/utils/orpc";

export function SettingsAvatarUpload() {
	const t = useTranslations("settings");
	const router = useRouter();
	const { data: session } = authClient.useSession();
	const image = session?.user.image ?? null;

	return (
		<SingleImageUploadField
			label={t("avatar.label")}
			description={t("avatar.description")}
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
