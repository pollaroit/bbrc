import { Text } from "@react-email/components";
import { AuthEmailLayout } from "./layout";

export type PasswordChangedProps = {
	name: string;
};

export function PasswordChangedTemplate({ name }: PasswordChangedProps) {
	return (
		<AuthEmailLayout
			preview="Your BBRC password was changed."
			title="Password changed"
		>
			<Text
				style={{ margin: "0 0 16px", color: "#3f3f46", lineHeight: "24px" }}
			>
				Hi {name}, your BBRC password was just changed. If this was you, no
				action is needed.
			</Text>
			<Text style={{ margin: 0, color: "#3f3f46", lineHeight: "24px" }}>
				If you did not change it, reset your password from the sign-in page and
				review your active sessions in Settings.
			</Text>
		</AuthEmailLayout>
	);
}
