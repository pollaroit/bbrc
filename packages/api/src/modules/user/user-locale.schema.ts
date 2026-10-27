import { LOCALES } from "@bbrc/i18n";
import zod from "zod";

const LocaleSchema = zod.enum(LOCALES);

export const SetLocaleInputSchema = zod.object({ locale: LocaleSchema });
export const SetLocaleOutputSchema = zod.object({ locale: LocaleSchema });
