import type { ImageTelemetry } from "@/src/lib/image";
import type { ModeId, ThemeId, Visibility } from "@/src/theme";

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

export function localGenerateVibe(rawInput: string): {
  title: string; tagline: string; theme: ThemeId; mode: ModeId; visibility: Visibility; tags: string[]; reason: string;
} {
  const seed = rawInput.trim().slice(0, 40) || "此刻眼前的微光";
  const clusters: { match: RegExp; theme: ThemeId; mode: ModeId; visibility: Visibility; tagline: (t: string) => string; tags: string[]; reason: string }[] = [
    { match: /落日|夕阳|黄昏|日落|晚霞|日出|天空|云海|余晖/, theme: "amber", mode: "gentle", visibility: "public", tagline: t => `在「${t}」里把抬头撞见的那束光留存下来，跨过城市山海拼成一场不落幕的黄昏展。`, tags: ["城市天际", "海边余晖", "窗边一角", "漫天晚霞"], reason: "识别到天际光影意象，已配齐「落日琥珀」色板与温柔共赏模式。" },
    { match: /秋|银杏|枫叶|落叶|桂花|金秋/, theme: "ginkgo", mode: "gentle", visibility: "public", tagline: t => `收集散落在各地街角与山林的秋意切片，让每一片金黄都在「${t}」里慢下来。`, tags: ["银杏大道", "落叶特写", "秋日风物", "山林层染"], reason: "识别到秋日风物色彩，已匹配「银杏暖金」与四维秋景分栏。" },
    { match: /猫|狗|橘座|萌宠|流浪猫|小狗|毛孩子/, theme: "ginkgo", mode: "ballot", visibility: "public", tagline: t => `一人五张选票，把镜头里最会营业的毛孩子送上「${t}」封神榜。`, tags: ["霸气正脸", "睡姿大赏", "抓拍表情包", "街头偶遇"], reason: "识别到萌宠打榜主题，已开启「5 票冲榜」与暖金勋章。" },
    { match: /代码|程序员|桌面|工位|键盘|极客|显示器|电脑|实验室|书桌/i, theme: "geek", mode: "ballot", visibility: "public", tagline: () => "晒出陪你战斗的生产力现场：屏幕、键盘、理线与灯光，五票决出硬核工位天花板。", tags: ["整桌全景", "外设特写", "氛围灯光", "极简理线"], reason: "识别到极客桌面美学，已切换「极客青蓝」冷光主题与 5 票冲榜。" },
    { match: /夜|霓虹|下班|下课|地铁|通勤|雨夜|街头|便利店|赛博/, theme: "neon", mode: "blind", visibility: "public", tagline: () => "征集期内票数盲盒封存，把今晚街头闪烁的霓虹与归途心事投进时间胶囊。", tags: ["雨夜霓虹", "车窗倒影", "地铁人潮", "街角微光"], reason: "识别到都市夜归氛围，已启用「赛博霓虹」与防跟风盲盒开奖。" },
    { match: /露营|徒步|山野|篝火|草坪|野餐|帐篷|户外/, theme: "mint", mode: "ballot", visibility: "private", tagline: () => "把山风、草木香和同行伙伴的抓拍锁进专属房间，投出这次出发的全场 MVP。", tags: ["营地全景", "篝火夜话", "旅途抓拍", "自然风物"], reason: "识别到户外结伴场景，已推荐「森林薄荷」加私密口令保护。" },
    { match: /音乐节|演出|乐队|演唱会|晚会|舞台/i, theme: "neon", mode: "ballot", visibility: "public", tagline: () => "灯光亮起、双手举过头顶的那一秒！汇总全场神仙机位，实时投出当晚最燃瞬间。", tags: ["主舞台高光", "台下沸腾", "乐手特写", "散场夜色"], reason: "识别到演出现场互动，已开启 5 票冲榜（推荐配合 16:9 现场投屏）。" },
    { match: /婚礼|庆典|派对|生日|聚会|散伙饭|毕业|年会/, theme: "amber", mode: "ballot", visibility: "private", tagline: () => "只对在场挚友开放的私密拾光间：汇总全员手机里的无损抓拍，投出今晚最佳神图！", tags: ["高光仪式", "挚友合影", "干杯瞬间", "幕后花絮"], reason: "识别到私密庆典聚会，已自动开启私密口令房与 5 票决选。" },
    { match: /美食|泡面|宵夜|深夜食堂|咖啡|食堂|晚餐|奶茶/, theme: "amber", mode: "ballot", visibility: "public", tagline: () => "热气腾腾的人间烟火最抚人心，交出你手机里最馋人的一张库存。", tags: ["灵魂特写", "深夜放毒", "饮品甜点", "餐桌日常"], reason: "识别到美食烟火主题，已配置暖调「落日琥珀」色温与冲榜赛制。" },
  ];
  for (const c of clusters) {
    if (c.match.test(seed)) {
      const title = seed.length < 6 ? `收集你相册里的${seed}` : seed;
      return { title, tagline: c.tagline(title), theme: c.theme, mode: c.mode, visibility: c.visibility, tags: c.tags, reason: c.reason };
    }
  }
  const clean = seed.replace(/^[#《「]+|[#》」]+$/g, "");
  const title = clean.length < 5 ? `一起拍下：${clean}` : clean;
  return {
    title,
    tagline: `围绕「${clean}」交出你相册里最有故事感的一帧画面，用镜头完成一场平行时空合展。`,
    theme: "amber", mode: "ballot", visibility: "public",
    tags: ["全景现场", "光影特写", "人物瞬间", "意外彩蛋"],
    reason: `已围绕「${clean}」自动生成四个摄影叙事分栏与冲榜赛制。`,
  };
}

export function localJudgeSubmission(roomTitle: string, roomTheme: ThemeId, payload: {
  tag: string; place: string; story: string; file_name: string; telemetry: ImageTelemetry;
}) {
  const text = `${payload.place} ${payload.story} ${payload.file_name}`;
  if (/赌博|博彩|裸聊|代开发票|刷单兼职|引流加微/i.test(text)) {
    return { allowed: false, off_topic: false, score: 6, reason: "AI 安全守门员拦截：检测到疑似推广或不当敏感词，请修改文字后重试。", caption: "" };
  }
  const t = payload.telemetry;
  const nameScreenshot = /screenshot|截屏|屏幕快照|snipaste|微信截图/i.test(payload.file_name);
  const isTech = /桌面|工位|程序员|代码|键盘|极客/i.test(roomTitle) || roomTheme === "geek";
  if (!isTech && ((t.uiFlatness > 0.62 && t.saturation < 0.16) || (nameScreenshot && t.uiFlatness > 0.42))) {
    const score = Math.max(19, Math.min(35, Math.round(36 - t.uiFlatness * 18)));
    return {
      allowed: true,
      off_topic: true,
      score,
      reason: `AI 命题裁判温和提醒：检测到画面含大面积纯色界面或屏幕截图特征（共鸣度 ${score}%），与「${roomTitle}」实拍光影调性偏离较大。建议换一张实拍照片，或勾选下方演示留存。`,
      caption: "一张误入片场的数字屏幕切片，在镜头与像素之间留下了反差注脚。",
    };
  }
  const tone = t.brightness < 0.36 ? "低照度暗调光影" : t.warmth > 0.48 ? "浓郁暖调色温" : t.coolness > 0.44 ? "清冽冷调秩序" : t.greenness > 0.3 ? "鲜活自然呼吸感" : "干净克制的明暗层次";
  const loc = payload.place.trim() ? `定格在${payload.place.trim()}的` : "镜头捕捉到的";
  const tail = payload.story.trim().length >= 4
    ? `与「${payload.story.trim().slice(0, 14)}${payload.story.trim().length > 14 ? "…" : ""}」的心绪悄然咬合。`
    : `为「${payload.tag}」分栏添上一枚恰到好处的切片。`;
  const bonus = (payload.story.trim().length >= 6 ? 3 : 0) + (payload.place.trim() ? 2 : 0) + (t.saturation > 0.3 ? 3 : 1);
  return {
    allowed: true,
    off_topic: false,
    score: Math.min(99, 89 + bonus),
    reason: "通过 AI 多模态安全与命题共鸣校验。",
    caption: `${loc}${tone}，${tail}`.slice(0, 58),
  };
}

export function localGenerateAward(roomTitle: string, mode: ModeId, revealed: boolean, moments: { author_name: string; place: string; tag: string; story: string; likes: number; votes: number | null }[]): string {
  if (!moments.length) return "展厅刚刚亮灯，等待第一张瞬间入驻后由 AI 首席策展人撰写颁奖词。";
  const totalLikes = moments.reduce((s, m) => s + m.likes, 0);
  const totalVotes = moments.reduce((s, m) => s + (m.votes ?? 0), 0);
  if (mode === "blind" && !revealed) {
    return `AI 盲盒策展速报 · 《${roomTitle}》已汇集 ${moments.length} 帧瞬间与 ${totalLikes} 次心动，选票正在盲盒封存中，点击「开奖揭晓」立刻解锁三甲归属！`;
  }
  const sorted = [...moments].sort((a, b) => mode === "gentle" ? (b.likes - a.likes) : ((b.votes ?? 0) - (a.votes ?? 0)) || (b.likes - a.likes));
  const top3 = sorted.slice(0, 3);
  if (mode === "gentle") {
    return `AI 策展人手记 · 在《${roomTitle}》的 ${moments.length} 幅共创画面里，累计点亮了 ${totalLikes} 颗红心。「${top3[0].author_name}」在${top3[0].place || top3[0].tag}留下的光影收获最高共鸣（${top3[0].likes} 赞）——不排名次，每一帧都是此刻生活的头版。`;
  }
  const medals = ["金冠", "银冠", "铜冠"];
  return `AI 首席颁奖词（累计 ${totalVotes} 票决选）· ` + top3.map((m, i) => `${medals[i]}颁给「${m.author_name}」${m.place ? `（${m.place}）` : ""}，斩获 ${m.votes ?? 0} 票 / ${m.likes} 赞`).join("；") + "！";
}
