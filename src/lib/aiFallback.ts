// Seed room & sample moment curated copy + local session cache for freshly uploaded AI captions.

export const SEED_ROOM_NOTES: Record<string, string> = {
  "sunset-1815": "本场共收录 6 座城市的黄昏切片：阿柚在上海徐汇滨江抓住了“橘子汽水色天际线”的最高人气共鸣，小满的厦门退潮镜面海滩与林一凡的里斯本天台光格紧随其后——同一轮太阳在不同经纬度的窗框里缓缓退场，拼成了一封不肯天黑的平行情书。",
  "desk-setup": "AI 首席颁奖词 · 金冠颁给「隔壁工位的老王」（深圳·后海）：12 厘米人体工学抬升堪称当代颈椎自救教科书；银冠颁给「BitCat」（成都）：暖黄桌垫撞色客制化键帽，每一敲都是清脆生产力；铜冠颁给「Vera」（北京·望京）：正面零线材外露的木质秩序感，治愈一切编译报错。",
  "campus-cats": "AI 首席颁奖词 · 金冠毫无悬念归属武汉老校门石柱上的「橘座」（猫协阿岚摄）：居高临下的蔑视下巴精准拿捏全校师生；银冠颁给西安石板路晒到融化的条纹光影「玄猫」（七点半摄）；铜冠颁给青岛宿舍楼下难得营业的琥珀瞳「三花」（Kiko 摄）！",
  "commute-1830": "盲盒策展观察：从东京雨夜街口的霓虹积水倒影、里斯本地铁车厢的低头族，到杭州晚班公交玻璃上的碎光斑与曼谷巷口红灯笼油锅声——票数尚在盲盒封存中，点击开奖即可揭晓今晚最戳心的归途瞬间。",
  "camp-party": "AI 私密派对颁奖词 · 金冠属于「周末野人阿信」在约书亚树拍下的星穹暖光帐篷，银河与营灯同频亮起；银冠归属「柚子皮」断网火堆旁的彻夜糗事局；铜冠颁给「Momo」莫干山草坡上人未齐先开拍的松弛感野餐布！",
};

export const SEED_MOMENT_AI: Record<string, { score: number; caption: string }> = {
  "sunset-1": { score: 99, caption: "高饱和琥珀色温铺满江岸剪影，把疲惫晚高峰酿成了微醺汽水。" },
  "sunset-2": { score: 97, caption: "潮汐退场留下的天然暗房，让黄昏在海平面上下对称复刻。" },
  "sunset-3": { score: 95, caption: "铁艺栏杆做成的胶片画框，把异乡傍晚切割得温柔又克制。" },
  "sunset-4": { score: 96, caption: "远山青黛与暖金暮霭层叠晕染，精准踩中东方水墨的留白呼吸。" },
  "sunset-5": { score: 94, caption: "碎金涟漪打破冷暖交界，快门定格了晚风揉皱湖面的零点一秒。" },
  "sunset-6": { score: 96, caption: "极简大小比例拉满旷野孤独感，以一人之影丈量整片暮色苍穹。" },
  "desk-1": { score: 96, caption: "自然侧逆光配人体工学黄金视距，清爽得像刚清空所有待办事项。" },
  "desk-2": { score: 95, caption: "浅景深精准咬合键帽字符，冷暖撞色把敲代码拍出了赛博演奏感。" },
  "desk-3": { score: 98, caption: "隐藏式走线达成强迫症满分审美，温润胡桃木中和了电子冷感。" },
  "desk-4": { score: 93, caption: "极简主义的三件套叙事，窗边斜阳替桌面做完了最后一步减法。" },
  "desk-5": { score: 95, caption: "双色温局部布光营造出静谧结界，让凌晨两点的屏幕不再刺眼。" },
  "cat-1": { score: 99, caption: "仰拍视角把十斤橘猫拍出一米八校霸气场，眼神杀统治力满分。" },
  "cat-2": { score: 97, caption: "木椅百叶光影恰好为黑猫披上斑马纹礼服，松弛感溢出屏幕。" },
  "cat-3": { score: 96, caption: "双眸清亮对焦如玻璃弹珠，抓住了三花女明星罕见的营业瞬间。" },
  "cat-4": { score: 94, caption: "绒毛逆光金边萌度超标，小小身躯踏出了巡视领地的坚定步伐。" },
  "cat-5": { score: 95, caption: "早八铃声吵不醒的资深旁听生，用团成一团的弧线诠释绝对安逸。" },
  "commute-1": { score: 98, caption: "柏油路积水化作赛博滤镜，洋红与青蓝霓虹在脚下折叠出第二座城。" },
  "commute-2": { score: 94, caption: "对称纵深透视收纳整节车厢的沉默，精准复刻当代都市归途共鸣。" },
  "commute-3": { score: 95, caption: "上帝视角俯瞰城市血管准点搏动，冷暖车灯织就精密的夜行乐谱。" },
  "commute-4": { score: 96, caption: "失焦散景与玻璃雨珠天然叠化，拍出了晚班车独有的微醺松弛时刻。" },
  "commute-5": { score: 93, caption: "升腾热气裹挟暖红灯笼光晕，一张图就能让人听见街头烟火滋啦声。" },
  "camp-1": { score: 99, caption: "冷调深邃星空与暖黄帐篷形成绝美冷暖对冲，荒野安全感拉满。" },
  "camp-2": { score: 97, caption: "跳动火光映亮围坐剪影，断网的四个小时反而存下了最清晰的笑声。" },
  "camp-3": { score: 95, caption: "红白格纹与鲜绿草坪明快撞色，把周末开场前的期待感拍得鲜活欲滴。" },
  "camp-4": { score: 94, caption: "暖金灯串引导视线伸向林间夜色，随手一挂就是露天电影开场。" },
  "camp-5": { score: 96, caption: "晨雾柔化了远山与野花边界，第一视角把掀开帐门的惊喜直接递到眼前。" },
};

const LOCAL_AI_CACHE_KEY = "imoments_local_ai_meta_v2";

export function cacheMomentAi(id: string, score: number, caption: string, origW: number, origH: number) {
  try {
    const raw = JSON.parse(sessionStorage.getItem(LOCAL_AI_CACHE_KEY) || "{}");
    raw[id] = { score, caption, origW, origH };
    sessionStorage.setItem(LOCAL_AI_CACHE_KEY, JSON.stringify(raw));
  } catch { /* ignore */ }
}

export function getCachedMomentAi(id: string): { score?: number; caption?: string; origW?: number; origH?: number } | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(LOCAL_AI_CACHE_KEY) || "{}");
    return raw[id] || null;
  } catch { return null; }
}
