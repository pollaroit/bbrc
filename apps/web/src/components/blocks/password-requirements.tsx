import { PASSWORD_REQUIREMENTS } from "@bbrc/schemas";
import { FieldDescription } from "@bbrc/ui/components/field";

export function PasswordRequirements() {
	return (
		<FieldDescription className="max-w-[65ch] leading-relaxed">
			{PASSWORD_REQUIREMENTS}
		</FieldDescription>
	);
}
