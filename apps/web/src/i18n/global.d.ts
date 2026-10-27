import type { Messages } from "@bbrc/i18n";
import type { routing } from "./routing";

declare module "next-intl" {
	interface AppConfig {
		Locale: (typeof routing.locales)[number];
		Messages: Messages;
	}
}
