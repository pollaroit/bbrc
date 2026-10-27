import type { Messages } from "../shape";

export const ratings: Messages["ratings"] = {
	definitions: {
		s0: {
			label: "Heç nə işləmir",
			text: "Onda heç nə işləmir və onu nə üçün oxuduğunuzu bilmirsiniz. Çətin ki kitab sayılsın: əlində qələm olan uşaq daha yaxşı hekayə danışardı. Onda yaxşı, hətta orta bir şey belə yoxdur və o, vaxtınızın tam itkisi idi. Bu, 0,5 deyil, çünki lehinə deyə biləcəyiniz bircə kiçik şey belə yoxdur.",
		},
		s1: {
			label: "Çox pis",
			text: "Qüsurlar hər yerdədir və vaxtınıza heyfsilənirsiniz, amma yenə də uğursuzluq olmayan tək bir şey tapa bildiniz: bir yaxşı fəsil, bir yaxşı yazılmış səhifə, bir ağıllı ideya. Bu, 1,5 deyil, çünki bundan başqa göstərə biləcəyiniz real səy və ya sənətkarlıq yoxdur, və 0,5 deyil, çünki o bir şey həqiqətən yaxşı idi, sadəcə mövcud deyildi.",
		},
		s2: {
			label: "Zəif",
			text: "Onu çətinliklə oxudunuz və problemlər eyni anda bir neçə yerdədir (hekayə, personajlar, yazı), saxlamağa dəyər cəmi bir neçə kiçik şey var. Dostunuzu ondan çəkindirərdiniz. Bu, 2,5 deyil, çünki yaxşı tərəflər heç nəyi tarazlamağa çatmayacaq qədər zəif idi, və 1,5 deyil, çünki hələ də işləyən və ya başqa oxucunun bəyənə biləcəyi bir şeyi göstərə bilərsiniz.",
		},
		s3: {
			label: "Orta",
			text: "Vaxtı keçirmək üçün düzgün seçim: bəzi hissələr alındı, bəziləri alınmadı və bir ildən sonra ondan çox şey xatırlamayacaqsınız. Nə çox sevdiniz, nə də peşman oldunuz. Bu, 3,5 deyil, çünki onu oxuduğunuza həqiqətən sevindirən bir şey olmadı, və 2,5 deyil, çünki heç vaxt yarımçıq qoymağa yaxın deyildiniz.",
		},
		s4: {
			label: "Əla",
			text: 'Onu həqiqətən bəyəndiniz, heç düşünmədən tövsiyə edərdiniz və güclü tərəfləri (hekayə, personajlar və ya yazı) aydındır. Bəzi gözə çarpan qüsurları var, amma heç vaxt kitabı yerə qoymaq istəmədiniz. Bu, 4,5 deyil, çünki oxuduğunuz ən yaxşı kitablardan biri kimi hiss olunmadı, və 3,5 deyil, çünki burada tövsiyəni heç bir "amma" olmadan edirsiniz.',
		},
		s5: {
			label: "Şedevr",
			text: "Şedevr, yüz ildə bir dəfə rast gəlinən kitab. Hər səhifəni sevdiniz və gözünüzü ondan ayıra bilmədiniz. Başlanğıc, personajlar, hekayə, yazı üslubu və sonluq qüsursuzdur, dəyişdirmək istədiyiniz bircə şey belə yoxdur. Bu, 4,5 deyil, çünki 4,5-də hələ də göstərə biləcəyiniz bir qüsur olur, burada isə heç biri yoxdur.",
		},
		s4_5: {
			label: "Şedevrə yaxın",
			text: "Şedevrə çox yaxın. Onu sevdiniz, hamının oxumasını istəyirsiniz və uzun müddət yadınızda qalacaq, amma yenə də bir kiçik qüsur deyə bilərsiniz: yavaş keçən bir hissə, alınmayan yan personaj, yalnız çox yaxşı olan sonluq. Bu, 5 deyil, çünki 5-də heç bir qüsur olmur, və 4 deyil, çünki bu kitab sadəcə əla yox, xüsusi hiss etdirdi.",
		},
		s3_5: {
			label: "Yaxşı, amma qeydlərlə",
			text: "Onu bəyəndiniz və oxuduğunuza şadsınız, amma real bir şey onu geri saxladı: uzanan orta hissə, tələsik sonluq, tam inanmadığınız personajlar. Bu, 4 deyil, çünki onu yalnız xəbərdarlıqla tövsiyə edərdiniz, və 3 deyil, çünki yaxşı tərəfləri pis tərəflərindən açıq-aydın üstün idi.",
		},
		s2_5: {
			label: "Ortadan aşağı",
			text: "Yaxşı məqamlar var idi, amma problemlər daha böyük idi: zəif süjet, düz personajlar və ya yolunuza çıxan yazı üslubu. Ümid və ya borc hissi ilə oxumağa davam etdiniz və tövsiyə etməzdiniz. Bu, 3 deyil, çünki məyusluq həzzdən üstün idi, və 2 deyil, çünki yaxşı məqamlar bir neçə cümlə deyil, həqiqətən var idi.",
		},
		s1_5: {
			label: "Pis",
			text: "Demək olar ki, heç nə işləmir. Oxuyub bitirmisinizsə, bu inadkarlıqdan olub, lehinə deyə biləcəyiniz yalnız bir kiçik şey (bir ideya, bir səhnə, maraqlı bir məkan) var. Bu, 2 deyil, çünki həmin bir şey əhəmiyyət daşımaq üçün kifayət etmədi, və 1 deyil, çünki kitab hələ də arxasında müəyyən sənətkarlıq olan real cəhd idi.",
		},
		s0_5: {
			label: "Demək olar ki, heç nə",
			text: "Təsadüfi pis olmayan bir kiçik şey tapa bilərsiniz (yaxşı açılış cümləsi, düzgün ad), qalan hər şey isə vaxt itkisi idi. Bu, 1 deyil, çünki həmin bir şey də çətinliklə sayılır, və 0 deyil, çünki 0-da yaxşı olan heç nə yoxdur.",
		},
	},
};
