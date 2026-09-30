"use client";

import { Alert, AlertDescription, AlertTitle } from "@bbrc/ui/components/alert";

export default function UserError({ error }: { error: Error }) {
	return (
		<div>
			<Alert variant="destructive">
				<AlertTitle>Error Occured!</AlertTitle>
				<AlertDescription>{error.message}</AlertDescription>
			</Alert>
		</div>
	);
}
