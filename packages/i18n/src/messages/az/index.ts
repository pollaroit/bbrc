import type { Messages } from "../shape";
import { achievements } from "./achievements";
import { errors } from "./errors";
import { genres } from "./genres";
import { labels } from "./labels";
import { notifications } from "./notifications";
import { ratings } from "./ratings";

/** Azerbaijani. Must have exactly the same keys, parameters and plural forms as English. */
export const az: Messages = {
	errors,
	labels,
	achievements,
	genres,
	ratings,
	notifications,
	language: {
		title: "Dil",
		description:
			"Tətbiqin dilini seçin. Bu, insanların yazdıqlarına təsir etmir.",
		current: "Hazırkı dil: {language}",
		switchTo: "{language} dilinə keç",
		saved: "Dil dəyişdirildi",
		failed: "Dil yadda saxlanmadı. Yenidən cəhd edin.",
	},
};
