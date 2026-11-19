// Attribution for the shipped sample photographs. Unsplash images are free to use under the
// Unsplash License; Wikimedia Commons files keep their original Creative Commons / public-domain terms.
export type Credit = { key: string; label: string; author: string; license: string; source: string };

const unsplash = (key: string, label: string, id: string): Credit => ({
  key, label, author: "Unsplash 摄影师", license: "Unsplash License", source: `https://images.unsplash.com/${id}`,
});
const commons = (key: string, label: string, author: string, license: string, file: string): Credit => ({
  key, label, author, license, source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`,
});

export const CREDITS: Credit[] = [
  unsplash("sunset-1", "城市天际线落日", "photo-1609194246158-702022cc4f13"),
  unsplash("sunset-2", "海面落日与湿沙倒影", "photo-1510693687184-709d94743506"),
  unsplash("sunset-3", "天台栏杆外的城市落日", "photo-1573137673551-b3b16e2214b3"),
  unsplash("sunset-4", "暮色中的层叠山脊", "photo-1612691272264-7493fc1d4ef7"),
  unsplash("sunset-5", "河面映出的橙红落日", "photo-1536318686067-5a15821de92a"),
  unsplash("sunset-6", "山脊上的登山者剪影", "photo-1602016082275-1c502e6d8100"),
  unsplash("desk-1", "日光下的家用办公桌", "photo-1518455027359-f3f8164ba6bd"),
  commons("desk-2", "RGB 背光机械键盘特写", "Jorge Franganillo", "CC BY 2.0", "Mars Gaming- MK6 gaming keyboard.jpg"),
  unsplash("desk-3", "大屏与架高笔记本的双屏工位", "photo-1610576660982-9eab5683cb42"),
  unsplash("desk-4", "窗边极简木桌", "photo-1737233347389-24bc3f3fe3a1"),
  commons("desk-5", "夜里亮着暖光台灯的桌面", "Vyacheslav Argenberg", "CC BY 4.0", "Brown and beige, Computer desk, Rostov-on-Don, Russia.jpg"),
  unsplash("cat-1", "门柱上的长毛橘猫", "photo-1640139712323-88bd00931f1f"),
  commons("cat-2", "石板路上晒太阳睡着的深色猫", "kcxd", "CC BY 2.0", "Sun worshipper (3487211541).jpg"),
  commons("cat-3", "琥珀色眼睛的三花猫", "Carbonroku", "CC BY-SA 3.0", "Amber-eyed calico Lilly2.jpg"),
  unsplash("cat-4", "草地里行走的小橘猫", "photo-1560114928-40f1f1eb26a0"),
  unsplash("cat-5", "木长椅上蜷睡的虎斑猫", "photo-1543201245-c9031909fe6f"),
  unsplash("commute-1", "雨夜街口与暖色店招倒影", "photo-1626780549530-f8fcb10342cb"),
  commons("commute-2", "地铁车厢里的通勤者", "Mike Steele", "CC BY 2.0", "Passengers on a metro train in Lisbon (41310497615).jpg"),
  unsplash("commute-3", "高处俯瞰的黄昏大道", "photo-1698907388777-237c13c7a084"),
  unsplash("commute-4", "雨点车窗外的城市光斑", "photo-1430382194875-e8b16e3c0b75"),
  commons("commute-5", "红灯笼下的夜市炸物摊", "PattayaPatrol", "CC BY-SA 4.0", "DZ6 1783 Night market food stall vendors frying and serving freshly cooked snacks under lantern light as customers browse the bustling street.jpg"),
  commons("camp-1", "星空下亮灯的帐篷", "Joshua Tree National Park", "Public domain", "Camping under the Stars (53548965222).jpg"),
  unsplash("camp-2", "黄昏篝火与火星", "photo-1620062868782-100e41142be3"),
  unsplash("camp-3", "草地上的野餐布与食物", "photo-1661583197297-bfc87c9eb043"),
  commons("camp-4", "通向小院的暖色灯串", "PattayaPatrol", "CC BY-SA 4.0", "DFC 4625 Twinkling string lights guide the way to a cozy garden café on a warm evening.jpg"),
  commons("camp-5", "雾中开满野花的草坡帐篷", "National Park Service, Alaska Region", "Public domain", "Camping in the Fog (21459401796).jpg"),
];

export const creditFor = (key: string | null) => CREDITS.find(credit => credit.key === key) ?? null;