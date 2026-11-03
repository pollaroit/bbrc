import { Button, Text } from "@react-email/components";
import { AuthEmailLayout } from "./layout";

export type ResetPasswordProps = {
	name: string;
	resetUrl: string;
};

export function ResetPasswordTemplate({ name, resetUrl }: ResetPasswordProps) {
	return (
		<AuthEmailLayout
			preview="Reset your BBRC password."
			title="Reset your password"
		>
			<Text
				style={{ margin: "0 0 16px", color: "#3f3f46", lineHeight: "24px" }}
			>
				Hi {name}, we received a request to reset your password. Choose a new
				password with the button below.
			</Text>
			<Button
				href={resetUrl}
				style={{
					backgroundColor: "#18181b",
					color: "#fafafa",
					display: "inline-block",
					fontSize: "14px",
					fontWeight: 600,
					padding: "12px 20px",
					textDecoration: "none",
				}}
			>
				Reset password
			</Button>
			<Text
				style={{
					margin: "20px 0 0",
					color: "#71717a",
					fontSize: "12px",
					lineHeight: "18px",
				}}
			>
				This link expires in one hour. If you did not ask for a reset, ignore
				this email and your password will stay the same.
			</Text>
		</AuthEmailLayout>
	);
}
