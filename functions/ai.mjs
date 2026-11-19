// iMoments · 拾光房间 — Dual-engine AI Curator & Multimodal Judge.
// Uses OpenAI-compatible / Qoder Cloud / DashScope LLM automatically when API credentials exist in env,
// with a deterministic visual-telemetry + Chinese semantic curator engine so previews & zero-key deploys work 100%.

function readEnv(name) {
  try {
    if (typeof Deno !== 'undefined' && Deno?.env?.get) return Deno.env.get(name) || '';
  } catch { /* ignore */ }
  try {
    if (typeof process !== 'undefined' && process?.env) return process.env[name] || '';
  } catch { /* ignore */ }
  return '';
}

async function callCloudLLM(systemPrompt, userPrompt) {
  const apiKey = readEnv('QODER_AI_API_KEY') || readEnv('DASHSCOPE_API_KEY') || readEnv('OPENAI_API_KEY');
  if (!apiKey) return null;
  const baseUrl = readEnv('QODER_AI_BASE_URL') || readEnv('AI_BASE_URL') || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
  const model = readEnv('QODER_AI_MODEL') || readEnv('AI_MODEL') || 'qwen-plus';
  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(8500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return null;
    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

const UNSAFE_PATTERNS = [
  /赌博|博彩|六合彩|裸聊|约炮|色情|代开发票|刷单兼职|高仿|假证|引流加微|vx[:：\s]*[a-z0-9_-]{5,}/i,
];

const VIBE_CLUSTERS = [
  {
    match: /落日|夕阳|黄昏|日落|晚霞|日出|晨光|破晓|天空|云海|余晖|18[:：]15/,
    theme: 'amber', mode: 'gentle', visibility: 'public',
    tagline: title => `在「${title}」里把抬头撞见的那束光留存下来，跨过城市山海拼成一场不落幕的黄昏展。`,
    tags: ['城市天际', '海边余晖', '窗边一角', '漫天晚霞'],
    reason: '识别到黄昏与天际光影意象，已自动配齐「落日琥珀」渐变与温柔共赏模式。',
  },
  {
    match: /秋|银杏|枫叶|落叶|桂花|金秋|栗子|晒秋/,
    theme: 'ginkgo', mode: 'gentle', visibility: 'public',
    tagline: title => `收集散落在各地街角与山林的秋意切片，让每一片金黄都在「${title}」里慢下来。`,
    tags: ['银杏大道', '落叶特写', '秋日风物', '山林层染'],
    reason: '识别到季节风物与秋日色彩，已匹配「银杏暖金」色板与四维秋景分栏。',
  },
  {
    match: /猫|狗|橘座|萌宠|流浪猫|小狗|修狗|毛孩子|柴犬|三花/,
    theme: 'ginkgo', mode: 'ballot', visibility: 'public',
    tagline: title => `一人五张选票，把镜头里最会营业、最有脾气的毛孩子送上「${title}」封神榜。`,
    tags: ['霸气正脸', '睡姿大赏', '抓拍表情包', '街头偶遇'],
    reason: '识别到萌宠打榜主题，已启用「稀缺选票冲榜」与暖金勋章体系。',
  },
  {
    match: /代码|程序员|桌面|工位|键盘|极客|显示器|电脑|实验室|科研|工科|书桌|setup/i,
    theme: 'geek', mode: 'ballot', visibility: 'public',
    tagline: title => `晒出陪你战斗的生产力现场：屏幕、键盘、理线与灯光，五票决出硬核工位天花板。`,
    tags: ['整桌全景', '外设特写', '氛围灯光', '极简理线'],
    reason: '识别到极客与桌面美学语义，已切换「极客青蓝」冷光主题与 5 票冲榜赛制。',
  },
  {
    match: /夜|霓虹|下班|下课|地铁|公交|通勤|雨夜|街头|便利店|赛博|晚高峰/,
    theme: 'neon', mode: 'blind', visibility: 'public',
    tagline: title => `征集期内票数盲盒封存，把今晚街头闪烁的霓虹与归途心事投进时间胶囊，开奖见分晓。`,
    tags: ['雨夜霓虹', '车窗倒影', '地铁人潮', '街角微光'],
    reason: '识别到都市夜归与街头快闪氛围，已配置「赛博霓虹」色板与防跟风盲盒开奖模式。',
  },
  {
    match: /露营|徒步|山野|篝火|草坪|野餐|帐篷|森林|春天|户外|骑行/,
    theme: 'mint', mode: 'ballot', visibility: 'private',
    tagline: title => `把山风、草木香和同行伙伴的抓拍锁进专属房间，投出这次出发最难忘的全场 MVP。`,
    tags: ['营地全景', '篝火夜话', '旅途抓拍', '自然风物'],
    reason: '识别到户外结伴出行场景，已推荐「森林薄荷」主题与私密口令保护。',
  },
  {
    match: /音乐节|livehouse|演出|乐队|演唱会|晚会|街舞|歌会|舞台/i,
    theme: 'neon', mode: 'ballot', visibility: 'public',
    tagline: title => `灯光亮起、双手举过头顶的那一秒！汇总全场神仙机位，实时投出当晚最燃舞台瞬间。`,
    tags: ['主舞台高光', '台下沸腾', '乐手特写', '散场夜色'],
    reason: '识别到演出现场高燃互动需求，已匹配「赛博霓虹」加 5 票实时冲榜（强烈推荐配合 16:9 现场投屏）。',
  },
  {
    match: /婚礼|庆典|派对|生日|聚会|散伙饭|毕业|同学会|年会/,
    theme: 'amber', mode: 'ballot', visibility: 'private',
    tagline: title => `只对在场挚友开放的私密拾光间：汇总全员手机里的无损抓拍，投出今晚全场最佳神图！`,
    tags: ['高光仪式', '挚友合影', '干杯瞬间', '幕后花絮'],
    reason: '识别到熟人庆典与私密聚会场景，已自动勾选「私密口令房」+「5 票冲榜」。',
  },
  {
    match: /美食|泡面|宵夜|深夜食堂|咖啡|食堂|做饭|晚餐|探店|奶茶/,
    theme: 'amber', mode: 'ballot', visibility: 'public',
    tagline: title => `热气腾腾的人间烟火最抚人心，交出你手机里最馋人的一张库存，看看谁能馋哭评论区。`,
    tags: ['灵魂特写', '深夜放毒', '饮品甜点', '餐桌日常'],
    reason: '识别到美食烟火气主题，已配置暖调「落日琥珀」食欲色温与冲榜互动。',
  },
];

export async function generateRoomVibe(rawInput) {
  const seed = String(rawInput || '').trim().slice(0, 40) || '此刻眼前的微光';
  const cloud = await callCloudLLM(
    '你是「iMoments 拾光房间」的 AI 空间造景师。根据用户输入的简短活动想法，返回 JSON：{"title":"润色后不超过22字的活动标题","tagline":"富有画面感和号召力的一句话征集导语(24-65字)","theme":"amber|ginkgo|geek|neon|mint 之一","mode":"gentle|ballot|blind 之一","visibility":"public|private","tags":["子分栏1","子分栏2","子分栏3","子分栏4"],"reason":"一句话说明为什么这样搭配"}。每个tag不超过6个字且互不重复。',
    `用户输入的活动想法：${seed}`
  );
  if (cloud && typeof cloud.tagline === 'string' && Array.isArray(cloud.tags) && cloud.tags.length >= 3) {
    const validThemes = ['amber', 'ginkgo', 'geek', 'neon', 'mint'];
    const validModes = ['gentle', 'ballot', 'blind'];
    const tags = [...new Set(cloud.tags.map(t => String(t).trim().slice(0, 10)).filter(Boolean))].slice(0, 4);
    if (tags.length >= 3) {
      return {
        title: String(cloud.title || seed).trim().slice(0, 40),
        tagline: cloud.tagline.trim().slice(0, 80),
        theme: validThemes.includes(cloud.theme) ? cloud.theme : 'amber',
        mode: validModes.includes(cloud.mode) ? cloud.mode : 'ballot',
        visibility: cloud.visibility === 'private' ? 'private' : 'public',
        tags,
        reason: String(cloud.reason || 'AI 已根据命题调性自动配齐视觉色板与赛制积木。').slice(0, 80),
        engine: 'cloud-agent',
      };
    }
  }

  for (const cluster of VIBE_CLUSTERS) {
    if (cluster.match.test(seed)) {
      const refinedTitle = seed.length < 6 ? `收集你相册里的${seed}` : seed;
      return {
        title: refinedTitle.slice(0, 40),
        tagline: cluster.tagline(refinedTitle).slice(0, 80),
        theme: cluster.theme,
        mode: cluster.mode,
        visibility: cluster.visibility,
        tags: cluster.tags,
        reason: cluster.reason,
        engine: 'semantic-vibe',
      };
    }
  }

  const cleanTopic = seed.replace(/^[#《「]+|[#》」]+$/g, '');
  return {
    title: cleanTopic.length < 5 ? `一起拍下：${cleanTopic}` : cleanTopic.slice(0, 40),
    tagline: `围绕「${cleanTopic}」交出你相册里最有故事感的一帧画面，用镜头完成一场平行时空合展。`.slice(0, 80),
    theme: 'amber',
    mode: 'ballot',
    visibility: 'public',
    tags: ['全景现场', '光影特写', '人物瞬间', '意外彩蛋'],
    reason: `已围绕「${cleanTopic}」自动拆解四个经典摄影叙事分栏与冲榜赛制。`,
    engine: 'semantic-vibe',
  };
}

const OFF_TOPIC_TEXT = [
  { roomMatch: /落日|夕阳|黄昏|晚霞/, clash: /代码报错|聊天记录|外卖订单|发票|表格截图|excel|word文档/i, hint: '文字描述似乎是工作截图或票据，和黄昏落日氛围隔了十万八千里哦' },
  { roomMatch: /猫|萌宠/, clash: /代码报错|发票|k线|股票截图|表格/i, hint: '没有嗅到猫咪毛茸茸的气息，倒像是误传了一张工作文件' },
];

export async function judgeMomentSubmission({ room, tag, place, story, fileName, telemetry }) {
  const combinedText = `${place || ''} ${story || ''} ${fileName || ''}`;
  for (const rx of UNSAFE_PATTERNS) {
    if (rx.test(combinedText)) {
      return {
        allowed: false,
        off_topic: false,
        score: 6,
        reason: 'AI 安全守门员拦截：检测到疑似广告引流或违规敏感词，请修改文字后重试。',
        caption: '',
      };
    }
  }

  const t = telemetry && typeof telemetry === 'object' ? telemetry : {};
  const uiFlatness = Number(t.uiFlatness) || 0;
  const warmth = Number(t.warmth) || 0.35;
  const coolness = Number(t.coolness) || 0.3;
  const greenness = Number(t.greenness) || 0.2;
  const brightness = Number(t.brightness) || 0.5;
  const saturation = Number(t.saturation) || 0.35;
  const nameLooksScreenshot = /screenshot|截屏|屏幕快照|snipaste|微信截图|qq截图/i.test(String(fileName || ''));
  const isTechRoom = /桌面|工位|程序员|代码|键盘|极客|屏幕/i.test(`${room.title} ${room.tagline}`) || room.theme === 'geek';

  // Detect obvious off-topic screenshot/document uploads in non-tech photography rooms
  if (!isTechRoom && ((uiFlatness > 0.62 && saturation < 0.16) || (nameLooksScreenshot && uiFlatness > 0.42))) {
    const score = Math.max(18, Math.min(35, Math.round(36 - uiFlatness * 18)));
    return {
      allowed: true,
      off_topic: true,
      score,
      reason: `AI 命题裁判温和提醒：检测到画面含大面积纯色界面或截图特征（命题共鸣度仅 ${score}%），与「${room.title}」的实拍光影调性不太相符。建议换一张实拍美图，若为功能测试也可勾选强行留存。`,
      caption: '一张误入片场的数字屏幕切片，在镜头与像素之间留下了反差注脚。',
    };
  }

  for (const rule of OFF_TOPIC_TEXT) {
    if (rule.roomMatch.test(room.title) && rule.clash.test(combinedText)) {
      return {
        allowed: true,
        off_topic: true,
        score: 29,
        reason: `AI 命题裁判温和提醒：${rule.hint}（共鸣度 29%）。换一张契合「${room.title}」的瞬间会更容易冲榜哦！`,
        caption: '跑题边缘的意外投递，像展览角落里一张叛逆的便签。',
      };
    }
  }

  // Compute grounded visual + semantic resonance score (86 - 99)
  let bonus = 0;
  if (room.theme === 'amber' && warmth > 0.42) bonus += 5;
  if (room.theme === 'ginkgo' && (warmth > 0.38 || saturation > 0.32)) bonus += 4;
  if (room.theme === 'geek' && (coolness > 0.32 || brightness < 0.55)) bonus += 5;
  if (room.theme === 'neon' && (brightness < 0.52 || saturation > 0.35)) bonus += 5;
  if (room.theme === 'mint' && (greenness > 0.28 || brightness > 0.4)) bonus += 5;
  if (story && story.trim().length >= 8) bonus += 3;
  if (place && place.trim().length >= 2) bonus += 2;
  const hashSeed = Array.from(`${story}${place}${tag}${fileName}`).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 7, 0);
  const score = Math.min(99, Math.max(85, 87 + bonus + (hashSeed % 4)));

  const cloud = await callCloudLLM(
    '你是「iMoments 拾光房间」的多模态摄影策展人。请根据房间主题与用户上传作品信息，返回 JSON：{"score":90到99之间的整数,"caption":"22到38字之间、富有胶片杂志美感的一句话拍立得旁白，不要使用引号"}。',
    `房间主题：${room.title}（${room.tagline}）\n所属子分栏：${tag}\n拍摄地点：${place || '未标注'}\n拍摄者故事：${story || '无文字'}\n画面色彩特征：暖度${warmth.toFixed(2)} 亮度${brightness.toFixed(2)} 饱和度${saturation.toFixed(2)}`
  );
  if (cloud && typeof cloud.caption === 'string' && cloud.caption.trim().length >= 8) {
    const cloudScore = Number(cloud.score);
    return {
      allowed: true,
      off_topic: false,
      score: Number.isFinite(cloudScore) ? Math.min(99, Math.max(80, Math.round(cloudScore))) : score,
      reason: '通过 AI 多模态安全与命题共鸣校验。',
      caption: cloud.caption.trim().slice(0, 60),
    };
  }

  // Crafted visual-aware Polaroid caption generator
  const toneWord = brightness < 0.36 ? '低照度暗调光影' : warmth > 0.48 ? '浓郁暖调色温' : coolness > 0.44 ? '清冽冷调秩序' : greenness > 0.3 ? '鲜活自然呼吸感' : '干净克制的明暗层次';
  const placePhrase = place && place.trim() ? `定格在${place.trim()}的` : '镜头捕捉到的';
  const storySnippet = story && story.trim().length >= 4
    ? `与「${story.trim().slice(0, 14)}${story.trim().length > 14 ? '…' : ''}」的心绪悄然咬合。`
    : `为「${tag}」分栏添上一枚恰到好处的切片。`;
  const caption = `${placePhrase}${toneWord}，${storySnippet}`.slice(0, 58);

  return {
    allowed: true,
    off_topic: false,
    score,
    reason: '通过 AI 多模态安全与命题共鸣校验。',
    caption,
  };
}

export async function generateRoomAward({ room, moments, topComments }) {
  if (!moments || moments.length === 0) {
    return '展厅刚刚亮灯，等待第一张瞬间入驻后由 AI 首席策展人撰写颁奖词。';
  }
  const ranked = [...moments].sort((a, b) =>
    room.mode === 'gentle'
      ? (b.likes - a.likes) || (b.comment_count - a.comment_count)
      : ((b.votes || 0) - (a.votes || 0)) || (b.likes - a.likes)
  );
  const top3 = ranked.slice(0, 3);
  const totalLikes = moments.reduce((s, m) => s + (Number(m.likes) || 0), 0);
  const totalVotes = moments.reduce((s, m) => s + (Number(m.votes) || 0), 0);

  const cloud = await callCloudLLM(
    '你是「iMoments 拾光房间」的首席策展颁奖官。请根据当前房间排名前三的作品与评论氛围，返回 JSON：{"award":"110到170字之间、有梗又有杂志温度的本场高光策展小记与前三名点名颁奖词"}。',
    `房间：《${room.title}》（赛制：${room.mode}，共${moments.length}件作品，${totalLikes}次喜欢，${totalVotes}张选票）\n前三名：${top3.map((m, i) => `第${i + 1}名 ${m.author_name}(${m.place || m.tag}, ${m.votes || 0}票/${m.likes}赞): ${m.story}`).join('；')}\n精选短评：${(topComments || []).slice(0, 4).map(c => c.body).join(' / ')}`
  );
  if (cloud && typeof cloud.award === 'string' && cloud.award.trim().length >= 20) {
    return cloud.award.trim().slice(0, 260);
  }

  if (room.mode === 'blind' && !room.revealed) {
    const places = [...new Set(moments.map(m => m.place).filter(Boolean))].slice(0, 3);
    return `AI 盲盒策展速报 · 房间已汇集 ${moments.length} 帧瞬间与 ${totalLikes} 次心动${places.length ? `（横跨 ${places.join('、')} 等坐标）` : ''}。目前选票仍在盲盒封存中，点击「开奖揭晓」即可解锁金银铜冠归属！`;
  }

  if (room.mode === 'gentle') {
    const first = top3[0];
    const second = top3[1];
    return `AI 策展人手记 · 在《${room.title}》的 ${moments.length} 幅共创画面里，累计亮起了 ${totalLikes} 颗红心。「${first.author_name}」在${first.place || `「${first.tag}」`}留下的瞬间收获最高共鸣（${first.likes} 赞）${second ? `，与「${second.author_name}」的镜头隔空呼应` : ''}——不设名次，每一帧都是此刻生活的头版。`;
  }

  const medals = ['金冠', '银冠', '铜冠'];
  const parts = top3.map((m, idx) => {
    const loc = m.place ? `（${m.place}）` : '';
    const detail = m.story ? `凭“${m.story.slice(0, 16)}${m.story.length > 16 ? '…' : ''}”` : `在「${m.tag}」分栏`;
    return `${medals[idx]}颁给「${m.author_name}」${loc}，${detail}斩获 ${m.votes || 0} 票（${m.likes} 赞）`;
  });
  return `AI 首席颁奖词（累计 ${totalVotes} 票决选）· ${parts.join('；')}！`;
}
