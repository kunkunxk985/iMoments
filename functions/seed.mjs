// Preset sample rooms. Shared by the deployed Function and the local fixture runner.
// Photographs are static site assets under /seed; counters and comments are illustrative sample content.
const sid = (prefix, n) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Actual pixel dimensions of the shipped sample photographs (public/seed/*.jpg).
const DIMS = {
  'sunset-1': [1600, 1066], 'sunset-2': [1600, 1067], 'sunset-3': [1280, 1600], 'sunset-4': [1600, 1201],
  'sunset-5': [1600, 1068], 'sunset-6': [1067, 1600],
  'desk-1': [1200, 1600], 'desk-2': [1600, 960], 'desk-3': [1600, 1052], 'desk-4': [1280, 1600], 'desk-5': [1600, 1063],
  'cat-1': [1600, 1066], 'cat-2': [1600, 1200], 'cat-3': [1600, 1071], 'cat-4': [1600, 1066], 'cat-5': [1600, 1066],
  'commute-1': [1600, 1059], 'commute-2': [1600, 1066], 'commute-3': [1600, 1066], 'commute-4': [1600, 1066], 'commute-5': [1600, 1064],
  'camp-1': [1066, 1600], 'camp-2': [1200, 1600], 'camp-3': [1067, 1600], 'camp-4': [1600, 1066], 'camp-5': [1600, 1066],
};

export const SEED_ROOMS = [
  {
    id: sid('10000000', 1), slug: 'sunset-1815', code: null, share_code: null,
    title: '收集相册里的 18:15 落日',
    tagline: '把今天傍晚那束光留下来，一起攒成一场不会天黑的展览。',
    visibility: 'public', mode: 'gentle', theme: 'amber',
    tags: ['城市天际', '海边余晖', '窗边一角', '天空现场'],
    cover_seed_key: 'sunset-1', cover_thumb_path: null, revealed: false,
    ai_curator_note: '本场共收录 6 座城市的黄昏切片：阿柚在上海徐汇滨江抓住了“橘子汽水色天际线”的最高人气共鸣，小满的厦门退潮镜面海滩与林一凡的里斯本天台光格紧随其后——同一轮太阳在不同经纬度的窗框里缓缓退场，拼成了一封不肯天黑的平行情书。',
    creator_id: 'seed:editor', creator_name: '拾光编辑部', moment_count: 6,
    created_at: '2026-11-02T10:15:00.000Z',
  },
  {
    id: sid('10000000', 2), slug: 'desk-setup', code: null, share_code: null,
    title: '程序员桌面与工位改造大赏',
    tagline: '晒出你的生产力现场：线材、灯光、键盘，还有那副摘下来的眼镜。',
    visibility: 'public', mode: 'ballot', theme: 'geek',
    tags: ['整桌全景', '键盘特写', '灯光氛围', '收纳理线'],
    cover_seed_key: 'desk-3', cover_thumb_path: null, revealed: false,
    ai_curator_note: 'AI 首席颁奖词 · 金冠颁给「隔壁工位的老王」（深圳·后海）：12 厘米人体工学抬升堪称当代颈椎自救教科书；银冠颁给「BitCat」（成都）：暖黄桌垫撞色客制化键帽，每一敲都是清脆生产力；铜冠颁给「Vera」（北京·望京）：正面零线材外露的木质秩序感，治愈一切编译报错。',
    creator_id: 'seed:editor', creator_name: '拾光编辑部', moment_count: 5,
    created_at: '2026-11-05T02:40:00.000Z',
  },
  {
    id: sid('10000000', 3), slug: 'campus-cats', code: null, share_code: null,
    title: '全校流浪猫封神榜',
    tagline: '一人五票，把校园里最会摆架子的那只猫送上神坛。',
    visibility: 'public', mode: 'ballot', theme: 'ginkgo',
    tags: ['橘座', '玄猫', '三花', '睡神'],
    cover_seed_key: 'cat-1', cover_thumb_path: null, revealed: false,
    ai_curator_note: 'AI 首席颁奖词 · 金冠毫无悬念归属武汉老校门石柱上的「橘座」（猫协阿岚摄）：居高临下的蔑视下巴精准拿捏全校师生；银冠颁给西安石板路晒到融化的条纹光影「玄猫」（七点半摄）；铜冠颁给青岛宿舍楼下难得营业的琥珀瞳「三花」（Kiko 摄）！',
    creator_id: 'seed:editor', creator_name: '猫协宣传部', moment_count: 5,
    created_at: '2026-11-08T06:05:00.000Z',
  },
  {
    id: sid('10000000', 4), slug: 'commute-1830', code: null, share_code: null,
    title: '今晚六点半的下班与下课路',
    tagline: '征集期内票数封存，开奖那一刻才知道谁拍中了今晚的城市。',
    visibility: 'public', mode: 'blind', theme: 'neon',
    tags: ['霓虹街口', '地铁通勤', '路口俯瞰', '车窗夜色'],
    cover_seed_key: 'commute-1', cover_thumb_path: null, revealed: false,
    ai_curator_note: '盲盒策展观察：从东京雨夜街口的霓虹积水倒影、里斯本地铁车厢的低头族，到杭州晚班公交玻璃上的碎光斑与曼谷巷口红灯笼油锅声——票数尚在盲盒封存中，点击开奖即可揭晓今晚最戳心的归途瞬间。',
    creator_id: 'seed:editor', creator_name: '夜路观察员', moment_count: 5,
    created_at: '2026-11-11T10:30:00.000Z',
  },
  {
    id: sid('10000000', 5), slug: 'camp-party', code: '0507', share_code: 'SG-MINT07',
    title: '周末露营与挚友派对实况',
    tagline: '口令房：只给一起去的人看。帐篷、篝火、灯串和笑到失声的夜。',
    visibility: 'private', mode: 'ballot', theme: 'mint',
    tags: ['帐篷时刻', '篝火夜话', '野餐布上', '灯串派对'],
    cover_seed_key: 'camp-1', cover_thumb_path: null, revealed: false,
    ai_curator_note: 'AI 私密派对颁奖词 · 金冠属于「周末野人阿信」在约书亚树拍下的星穹暖光帐篷，银河与营灯同频亮起；银冠归属「柚子皮」断网火堆旁的彻夜糗事局；铜冠颁给「Momo」莫干山草坡上人未齐先开拍的松弛感野餐布！',
    creator_id: 'seed:editor', creator_name: '周末野人小队', moment_count: 5,
    created_at: '2026-11-14T09:20:00.000Z',
  },
];

const M = (n, room, key, author_name, place, tag, story, likes, votes, ai_score, ai_caption, created_at) => ({
  id: sid('20000000', n), room_id: sid('10000000', room), author_id: `seed:${key}`,
  author_name, place, tag, story, seed_key: key, object_path: null, thumb_path: null,
  original_path: null, original_width: DIMS[key][0], original_height: DIMS[key][1],
  ai_score, ai_caption,
  status: 'ready', width: DIMS[key][0], height: DIMS[key][1], likes, votes, comment_count: 0, created_at,
});

export const SEED_MOMENTS = [
  M(1, 1, 'sunset-1', '阿柚', '上海 · 徐汇滨江', '城市天际', '加班到六点一刻，抬头发现整片天际线都被镀成了橘子汽水的颜色。', 128, 0, 99, '高饱和琥珀色温铺满江岸剪影，把疲惫晚高峰酿成了微醺汽水。', '2026-11-02T10:20:00.000Z'),
  M(2, 1, 'sunset-2', '小满', '厦门 · 环岛路', '海边余晖', '浪退下去的时候，湿沙滩变成了一面镜子，太阳在里面又落了一次。', 96, 0, 97, '潮汐退场留下的天然暗房，让黄昏在海平面上下对称复刻。', '2026-11-03T09:40:00.000Z'),
  M(3, 1, 'sunset-3', '林一凡', '里斯本 · 天台栏杆边', '窗边一角', '没有出门的傍晚，隔着栏杆看光一寸一寸从屋顶上退下去。', 87, 0, 95, '铁艺栏杆做成的胶片画框，把异乡傍晚切割得温柔又克制。', '2026-11-04T10:05:00.000Z'),
  M(4, 1, 'sunset-4', '南山南', '长沙 · 岳麓山', '天空现场', '爬到山顶刚好赶上最后一层光，山脊一层一层淡下去，像水墨没干。', 64, 0, 96, '远山青黛与暖金暮霭层叠晕染，精准踩中东方水墨的留白呼吸。', '2026-11-06T08:55:00.000Z'),
  M(5, 1, 'sunset-5', '江河', '南京 · 玄武湖', '海边余晖', '水面把天空复制了一份，风一吹，两份都碎了。', 52, 0, 94, '碎金涟漪打破冷暖交界，快门定格了晚风揉皱湖面的零点一秒。', '2026-11-08T10:12:00.000Z'),
  M(6, 1, 'sunset-6', '阿眠', '武功山 · 山脊线', '天空现场', '山脊上那个小小的剪影，是今天最后一束光的目击者。', 41, 0, 96, '极简大小比例拉满旷野孤独感，以一人之影丈量整片暮色苍穹。', '2026-11-10T10:18:00.000Z'),

  M(7, 2, 'desk-1', '隔壁工位的老王', '深圳 · 后海', '整桌全景', '改造第三版：屏幕抬高了 12 厘米，颈椎终于不抗议了。', 74, 12, 96, '自然侧逆光配人体工学黄金视距，清爽得像刚清空所有待办事项。', '2026-11-05T03:10:00.000Z'),
  M(8, 2, 'desk-2', 'BitCat', '成都 · 天府三街', '键盘特写', '灯效亮起来的那一刻，工位变成了一个小型电竞现场。', 61, 9, 95, '浅景深精准咬合键帽字符，冷暖撞色把敲代码拍出了赛博演奏感。', '2026-11-05T08:22:00.000Z'),
  M(9, 2, 'desk-3', 'Vera', '北京 · 望京', '整桌全景', '大屏加一台架高的笔记本，耳机和杯子各就各位，正面只剩木头和光。', 55, 7, 98, '隐藏式走线达成强迫症满分审美，温润胡桃木中和了电子冷感。', '2026-11-06T01:45:00.000Z'),
  M(10, 2, 'desk-4', '糖炒栗子', '苏州 · 居家办公', '收纳理线', '桌上只留三样东西：电脑、本子，和一副摘下来的眼镜。', 43, 4, 93, '极简主义的三件套叙事，窗边斜阳替桌面做完了最后一步减法。', '2026-11-07T05:30:00.000Z'),
  M(11, 2, 'desk-5', '深夜修图师', '广州 · 珠江新城', '灯光氛围', '暖光台灯加屏幕挂灯，凌晨两点的工位看起来像深夜食堂。', 38, 2, 95, '双色温局部布光营造出静谧结界，让凌晨两点的屏幕不再刺眼。', '2026-11-09T16:05:00.000Z'),

  M(12, 3, 'cat-1', '猫协阿岚', '武汉 · 老校门石柱', '橘座', '橘座日常：占据门柱最高处，用下巴示意人类可以退下了。', 152, 18, 99, '仰拍视角把十斤橘猫拍出一米八校霸气场，眼神杀统治力满分。', '2026-11-08T06:20:00.000Z'),
  M(13, 3, 'cat-2', '七点半', '西安 · 长椅边石板路', '玄猫', '晒太阳晒到融化，长椅的影子条纹一样盖在它身上。', 121, 15, 97, '木椅百叶光影恰好为黑猫披上斑马纹礼服，松弛感溢出屏幕。', '2026-11-08T07:10:00.000Z'),
  M(14, 3, 'cat-3', 'Kiko', '青岛 · 宿舍楼下', '三花', '琥珀色眼睛直勾勾看镜头，三花今天心情好，允许我拍了三张。', 98, 11, 96, '双眸清亮对焦如玻璃弹珠，抓住了三花女明星罕见的营业瞬间。', '2026-11-09T02:35:00.000Z'),
  M(15, 3, 'cat-4', '二两', '大理 · 草地边', '橘座', '刚满月的小橘猫，走路还在打滑，但气势已经是全场第一。', 86, 6, 94, '绒毛逆光金边萌度超标，小小身躯踏出了巡视领地的坚定步伐。', '2026-11-10T04:15:00.000Z'),
  M(16, 3, 'cat-5', '木木', '上海 · 教学楼外长椅', '睡神', '长椅上的常驻嘉宾，睡姿专业到像被聘请来当模特的。', 67, 3, 95, '早八铃声吵不醒的资深旁听生，用团成一团的弧线诠释绝对安逸。', '2026-11-12T03:00:00.000Z'),

  M(17, 4, 'commute-1', 'Nova', '东京 · 雨夜街口', '霓虹街口', '下雨的六点半，招牌在地面上又亮了一次，城市有了倒影。', 88, 7, 98, '柏油路积水化作赛博滤镜，洋红与青蓝霓虹在脚下折叠出第二座城。', '2026-11-11T10:40:00.000Z'),
  M(18, 4, 'commute-2', '陈同学', '里斯本 · 地铁车厢', '地铁通勤', '车厢里所有人都在低头，只有头顶的灯和线路图一路陪着。', 71, 5, 94, '对称纵深透视收纳整节车厢的沉默，精准复刻当代都市归途共鸣。', '2026-11-11T11:02:00.000Z'),
  M(19, 4, 'commute-3', '大熊', '东京 · 新宿高处', '路口俯瞰', '从高处看六点半的路口，车流和人行道同时开始流动。', 65, 4, 95, '上帝视角俯瞰城市血管准点搏动，冷暖车灯织就精密的夜行乐谱。', '2026-11-12T10:25:00.000Z'),
  M(20, 4, 'commute-4', '阿澈', '杭州 · 晚班公交', '车窗夜色', '雨点贴在车窗上，外面的灯全部化成一团一团的光斑。', 54, 3, 96, '失焦散景与玻璃雨珠天然叠化，拍出了晚班车独有的微醺松弛时刻。', '2026-11-13T10:50:00.000Z'),
  M(21, 4, 'commute-5', '小暑', '曼谷 · 夜市巷口', '霓虹街口', '红灯笼下的炸物摊，油锅的声音是下课路上最暖的白噪音。', 47, 2, 93, '升腾热气裹挟暖红灯笼光晕，一张图就能让人听见街头烟火滋啦声。', '2026-11-14T10:10:00.000Z'),

  M(22, 5, 'camp-1', '周末野人阿信', '加州 · 约书亚树营地', '帐篷时刻', '帐篷亮起的那一刻，头顶的星星刚好也亮了。', 63, 9, 99, '冷调深邃星空与暖黄帐篷形成绝美冷暖对冲，荒野安全感拉满。', '2026-11-14T12:20:00.000Z'),
  M(23, 5, 'camp-2', '柚子皮', '营地 · 篝火边', '篝火夜话', '火堆旁没有信号，于是我们把这一年的糗事都讲完了。', 58, 7, 97, '跳动火光映亮围坐剪影，断网的四个小时反而存下了最清晰的笑声。', '2026-11-14T13:05:00.000Z'),
  M(24, 5, 'camp-3', 'Momo', '莫干山 · 野餐布上', '野餐布上', '布一铺开，沙拉、面包和气泡水就位，人还没到齐。', 45, 5, 95, '红白格纹与鲜绿草坪明快撞色，把周末开场前的期待感拍得鲜活欲滴。', '2026-11-15T02:40:00.000Z'),
  M(25, 5, 'camp-4', '老周', '营地 · 灯串小径', '灯串派对', '灯串一路挂到小院门口，夜晚立刻有了节日的表情。', 39, 3, 94, '暖金灯串引导视线伸向林间夜色，随手一挂就是露天电影开场。', '2026-11-15T12:15:00.000Z'),
  M(26, 5, 'camp-5', '阿柚', '阿拉斯加 · 雾中草坡', '帐篷时刻', '六点被鸟叫醒，拉开帐门是一整片雾和开满花的草坡，值了。', 31, 1, 96, '晨雾柔化了远山与野花边界，第一视角把掀开帐门的惊喜直接递到眼前。', '2026-11-16T00:30:00.000Z'),
];

const C = (n, moment, author_name, body, minutes) => ({
  id: sid('30000000', n), moment_id: sid('20000000', moment), room_id: SEED_MOMENTS[moment - 1].room_id,
  author_id: `seed:c${n}`, author_name, body, floor: 0,
  created_at: new Date(Date.parse(SEED_MOMENTS[moment - 1].created_at) + minutes * 60000).toISOString(),
});

export const SEED_COMMENTS = [
  C(1, 1, '小满', '这个橙色太犯规了，我隔着屏幕都感觉到暖。', 24),
  C(2, 1, '深夜修图师', '天际线那条高光留得刚好，没有过曝，学到了。', 61),
  C(3, 1, '阿眠', '六点一刻的城市，我也在同一分钟抬过头。', 140),
  C(4, 2, '江河', '湿沙滩的镜像可以直接当年历封面。', 33),
  C(5, 2, 'Kiko', '请问是退潮时候拍的吗？下次我也去蹲。', 92),
  C(6, 2, '阿柚', '太阳落了两次，这个说法我记住了。', 180),
  C(7, 3, '糖炒栗子', '没出门的傍晚也值得被收集，这张最打动我。', 45),
  C(8, 3, 'Vera', '栏杆把画面切成一格一格，光从格子里漏下来。', 120),
  C(9, 4, '南山南', '层峦的雾感拍出来了，爬山两小时值了。', 70),
  C(10, 4, '木木', '像水墨没干——这句配文比图还狠。', 150),
  C(11, 5, '阿澈', '风一吹两份都碎了，好会写。', 55),
  C(12, 5, '小暑', '水面的碎金拍得很稳，快门多少？', 130),
  C(13, 6, 'Nova', '小小的剪影，大大的天空，比例舒服。', 40),
  C(14, 6, '陈同学', '最后一束光的目击者，这个说法太浪漫了。', 100),
  C(15, 7, 'BitCat', '抬高 12 厘米这个数据很真实，颈椎党狂喜。', 30),
  C(16, 7, 'Vera', '白天光线这么足，根本不用开灯。', 85),
  C(17, 7, '糖炒栗子', '求显示器支架型号，我也想改造。', 160),
  C(18, 8, '隔壁工位的老王', '灯效和黄色桌垫撞色，居然很和谐。', 25),
  C(19, 8, '深夜修图师', '键帽特写拍得干净，背景虚化也舒服。', 90),
  C(20, 9, 'BitCat', '笔记本架高当副屏，这个思路我明天就试。', 40),
  C(21, 9, '老周', '正面只剩木头和光，这就是理线的终极目标。', 110),
  C(22, 10, 'Momo', '窗边那束光落在本子上，看着就想坐下来写字。', 35),
  C(23, 10, '阿岚', '三样东西的桌面，克制得让人羡慕。', 125),
  C(24, 11, 'Vera', '深夜食堂这个比喻太准了，暖光真的治愈。', 50),
  C(25, 11, '陈同学', '屏幕挂灯 + 台灯的组合，眼睛会谢谢你。', 145),
  C(26, 12, '七点半', '橘座的下巴角度确实是王者级别。', 20),
  C(27, 12, 'Kiko', '它看镜头的眼神像在说：拍可以，别摸。', 65),
  C(28, 12, '二两', '这一票我投得心服口服。', 130),
  C(29, 12, '木木', '门柱那只我也拍过，同一只猫！', 200),
  C(30, 13, '猫协阿岚', '长椅影子条纹盖在身上，这个光影绝了。', 28),
  C(31, 13, '小满', '晒到融化的样子太治愈了，想摸。', 95),
  C(32, 14, '柚子皮', '琥珀色眼睛直勾勾看镜头，谁顶得住。', 38),
  C(33, 14, '阿信', '三花的脾气全写在眼神里了哈哈。', 105),
  C(34, 15, 'Momo', '走路打滑但气势第一，这就是奶猫。', 22),
  C(35, 15, '老周', '这么小只，眼睛已经这么亮了。', 88),
  C(36, 16, '七点半', '长椅那只姿势真的专业，怀疑有编制。', 44),
  C(37, 16, 'Kiko', '教学楼外长椅是全校最佳猫位，认同。', 118),
  C(38, 17, '阿澈', '雨夜霓虹的倒影，城市有了第二层。', 26),
  C(39, 17, '小暑', '这张的色调像电影截图，想知道参数。', 80),
  C(40, 18, 'Nova', '车厢里的灯和线路图，通勤人的共同背景。', 31),
  C(41, 18, '大熊', '低头的人群和头顶的灯，构图很稳。', 99),
  C(42, 19, '陈同学', '高处看路口，城市像一块正在通电的板子。', 42),
  C(43, 19, '阿柚', '车流的光轨抓得刚好，没有糊。', 115),
  C(44, 20, '小暑', '光斑糊成一片的时候，人也就放松了。', 36),
  C(45, 20, 'Vera', '雨点贴在车窗上这个细节太真实。', 108),
  C(46, 21, '阿澈', '红灯笼下的油锅声，是冬夜最暖的白噪音。', 29),
  C(47, 21, '糖炒栗子', '夜市永远在下课路上等着我们。', 92),
  C(48, 22, '柚子皮', '帐篷和星星同时亮起，这个时机绝了。', 34),
  C(49, 22, 'Momo', '戈壁营地求坐标，下次想去。', 100),
  C(50, 23, '阿信', '没有信号的夜晚才是真的在一起。', 27),
  C(51, 23, '老周', '糗事讲完了，明年还得再来一次。', 86),
  C(52, 24, '阿柚', '人还没到齐就先开拍，太真实了。', 41),
  C(53, 24, '七点半', '野餐布上的光斑好看，构图也松。', 120),
  C(54, 25, 'Momo', '灯串一路挂到门口，夜晚立刻有节日表情。', 33),
  C(55, 25, '阿信', '这个暖色和夜色太配了。', 97),
  C(56, 26, '柚子皮', '六点被鸟叫醒，值了这两个字我懂。', 48),
  C(57, 26, '老周', '拉开帐门是一整片雾，这张最安静。', 130),
];

const countBy = (rows, key) => rows.reduce((map, row) => { map[row[key]] = (map[row[key]] || 0) + 1; return map; }, {});

export function seedPayload() {
  const floors = {};
  const comments = [...SEED_COMMENTS]
    .sort((a, b) => a.created_at < b.created_at ? -1 : 1)
    .map(row => ({ ...row, floor: (floors[row.moment_id] = (floors[row.moment_id] || 0) + 1) }));
  const totals = countBy(comments, 'moment_id');
  const moments = SEED_MOMENTS.map(row => ({ ...row, comment_count: totals[row.id] || 0 }));
  // The reviewed schema has no DB defaults; every NOT NULL column must be supplied here.
  const rooms = SEED_ROOMS.map((row, index) => ({ ...row, idempotency_key: row.idempotency_key || sid('40000000', index + 1) }));
  return { rooms, moments, comments };
}

// Idempotent: fixed primary keys plus insertIfAbsent make concurrent cold starts safe.
// The platform adapter accepts single-row upserts only, so seed in bounded concurrent chunks.
export async function ensureSeed(db, BackendError) {
  const stage = async (name, fn) => {
    try { return await fn(); }
    catch (error) {
      // Safe diagnostics only: stage + error class/code, never provider messages or SQL.
      throw new BackendError(`seed_${name}_${error?.code || error?.name || 'unknown'}`, 500);
    }
  };
  const existing = await stage('probe', () => db.from('rooms').select('id').eq('slug', SEED_ROOMS[0].slug).limit(1));
  if (existing.error) throw new BackendError(existing.error.code || 'database_unavailable', existing.error.status || 503);
  if (existing.data?.length) return false;
  const { rooms, moments, comments } = seedPayload();
  const writeRow = async (table, row) => {
    const result = await db.from(table).insertIfAbsent(row, { onConflict: 'id' });
    if (result?.error && result.error.code !== 'duplicate_key') throw result.error;
  };
  const writeAll = (table, list) => stage(table, async () => {
    // Sequential: the injected database client is not safe for concurrent requests.
    for (const row of list) await writeRow(table, row);
  });
  await writeAll('rooms', rooms);
  await writeAll('moments', moments);
  await writeAll('comments', comments);
  return true;
}
