import type { Messages } from "../shape";

export const labels: Messages["labels"] = {
	progress: {
		not_started: "Başlanmayıb",
		in_progress: "Oxuyur",
		completed: "Tamamlayıb",
		dnf: "Yarımçıq qalıb",
	},
	sittingStatus: {
		voting: "Səsvermə",
		reading: "Oxuma",
		finished: "Bitib",
	},
	bookStatus: {
		completed: "Tamamlanıb",
		reading: "Oxunur",
		wishlist: "İstək siyahısı",
		description: {
			completed: "Klub bu kitabı oxuyub bitirib.",
			reading: "Bu kitab klubun aktiv oxumasındadır.",
			wishlist: "Gələcək oxuma sessiyası və ya səsvermə üçün gözləyir.",
		},
	},
};
