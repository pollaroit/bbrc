import { z } from "zod";

export const ListCatalogOlidsOutputSchema = z.object({
	olids: z.array(z.string()),
});

export type ListCatalogOlidsOutput = z.infer<
	typeof ListCatalogOlidsOutputSchema
>;
