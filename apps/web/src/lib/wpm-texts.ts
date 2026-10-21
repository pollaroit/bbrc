export const wpmLanguages = [
	{ code: "en", label: "English" },
	{ code: "az", label: "Azərbaycanca" },
	{ code: "tr", label: "Türkçe" },
	{ code: "ru", label: "Русский" },
] as const;

export type WpmLanguage = (typeof wpmLanguages)[number]["code"];

/**
 * Short original passages (about 120 words each) used to time reading speed.
 * Replace with excerpts from a public-domain source if you prefer.
 */
export const wpmTexts: Record<WpmLanguage, string> = {
	en: "Every reader remembers the first book that truly held them. It might have been a battered paperback passed along by a friend, or a thick volume found on a high shelf in a quiet house. What matters is the moment the room fell away and only the story remained. Hours passed without notice, and the final page arrived far too soon. Since then, the habit has stayed. A book on the table, another in the bag, a third waiting patiently on the nightstand. Reading is rarely a race, yet knowing your natural pace helps you plan: how many pages fit into a commute, how long a chapter will take before dinner, and when a shared book will be finished. Read at the speed that feels comfortable and natural.",
	az: "Hər oxucu özünü həqiqətən ələ keçirən ilk kitabı xatırlayır. Bu, dostun verdiyi köhnə cildli kitab, ya da sakit bir evdə yuxarı rəfdə tapılmış qalın cild ola bilər. Əsas olan otağın yox olub yalnız hekayənin qaldığı andır. Saatlar fərq edilmədən keçir, son səhifə isə çox tez gəlib çatır. O vaxtdan bəri bu vərdiş qalıb. Masanın üstündə bir kitab, çantada digəri, çarpayının yanında isə üçüncüsü səbirlə gözləyir. Oxumaq nadir hallarda yarışdır, amma öz təbii sürətini bilmək planlaşdırmağa kömək edir: yolda neçə səhifə oxumaq olar, şam yeməyindən əvvəl bir fəsil nə qədər çəkər, birgə oxunan kitab nə vaxt bitər. Özünüzü rahat hiss etdiyiniz sürətlə oxuyun.",
	tr: "Her okur, kendisini gerçekten saran ilk kitabı hatırlar. Bu, bir arkadaşın verdiği yıpranmış bir ciltli kitap ya da sessiz bir evde yüksek bir rafta bulunan kalın bir cilt olabilir. Önemli olan, odanın kaybolup yalnızca hikâyenin kaldığı andır. Saatler fark edilmeden geçer, son sayfa ise çok çabuk gelir. O günden beri bu alışkanlık hiç bırakmadı. Masanın üstünde bir kitap, çantada bir başkası, komodinde de üçüncüsü sabırla bekler. Okumak nadiren bir yarıştır, ama doğal hızınızı bilmek plan yapmaya yardımcı olur: yolda kaç sayfa okunur, akşam yemeğinden önce bir bölüm ne kadar sürer, ortak okunan kitap ne zaman biter. Kendinizi rahat hissettiğiniz hızda okuyun.",
	ru: "Каждый читатель помнит первую книгу, которая по-настоящему его захватила. Это мог быть потрёпанный томик, который дал друг, или толстая книга, найденная на верхней полке в тихом доме. Важен тот миг, когда комната исчезает и остаётся только история. Часы проходят незаметно, а последняя страница приходит слишком быстро. С тех пор эта привычка не оставляет. Одна книга лежит на столе, другая в сумке, третья терпеливо ждёт у кровати. Чтение редко бывает гонкой, но знать свой естественный темп полезно для планов: сколько страниц можно прочитать в дороге, сколько времени займёт глава до ужина, когда будет закончена общая книга. Читайте в том темпе, который вам удобен и привычен.",
};
