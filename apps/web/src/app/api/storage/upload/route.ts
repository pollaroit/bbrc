import {
	handleDirectImageUpload,
	parseDirectUploadTarget,
} from "@bbrc/api/modules/storage/storage-direct-upload";
import type { NextRequest } from "next/server";

import { createContext } from "@/context";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	const context = await createContext(req);

	let formData: FormData;
	try {
		formData = await req.formData();
	} catch {
		return Response.json({ error: "Invalid form data" }, { status: 400 });
	}

	const target = parseDirectUploadTarget(formData);
	if (!target) {
		return Response.json({ error: "Invalid upload target" }, { status: 400 });
	}

	const file = formData.get("file");
	if (!(file instanceof File)) {
		return Response.json({ error: "Missing image file" }, { status: 400 });
	}

	return handleDirectImageUpload(context, target, file);
}
