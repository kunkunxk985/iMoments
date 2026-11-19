// iMoments · 拾光房间 — Real Cloud LLM & Vision (GLM-4-Flash / GLM-4V-Flash) Engine.
// No local card-drawing libraries or silent fake fallbacks: user-configured credentials take top priority.

function readEnv(name) {
  try {
    if (typeof Deno !== 'undefined' && Deno?.env?.get) return Deno.env.get(name) || '';
  } catch { /* ignore */ }
  try {
    if (typeof process !== 'undefined' && process?.env) return process.env[name] || '';
  } catch { /* ignore */ }
  return '';
}

function getAiConfig() {
  // User-configured OPENAI_API_KEY / AI_BASE_URL / AI_MODEL always take top priority
  const apiKey = readEnv('OPENAI_API_KEY') || readEnv('QODER_AI_API_KEY') || readEnv('DASHSCOPE_API_KEY');
  const baseUrl = readEnv('AI_BASE_URL') || readEnv('QODER_AI_BASE_URL') || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  const model = readEnv('AI_MODEL') || readEnv('QODER_AI_MODEL') || (baseUrl.includes('bigmodel.cn') ? 'glm-4-flash-250414' : 'qwen-plus');
  const visionModel = readEnv('AI_VISION_MODEL') || (baseUrl.includes('bigmodel.cn') ? 'glm-4v-flash' : model);
  return { apiKey, baseUrl, model, visionModel };
}

function aiError(code, status = 503) {
  const err = new Error(code);
  err.code = code;
  err.status = status;
  return err;
}

function extractJson(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { /* try substring */ }
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
  }
  return null;
}

async function callTextLLM(systemPrompt, userPrompt, temperature = 0.78) {
  const { apiKey, baseUrl, model } = getAiConfig();
  if (!apiKey) throw aiError('ai_not_configured', 503);
  let res;
  try {
    res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw aiError('ai_unavailable', 503);
  }
  if (!res.ok) throw aiError('ai_unavailable', 503);
  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  const parsed = extractJson(content);
  if (!parsed) throw aiError('ai_unavailable', 503);
  return { data: parsed, model };
}

async function callVisionLLM(imageDataUrl, prompt) {
  const { apiKey, baseUrl, visionModel } = getAiConfig();
  if (!apiKey) throw aiError('ai_not_configured', 503);
  let res;
  try {
    // Keep payload minimal (no max_tokens / response_format) for Zhipu glm-4v-flash compatibility
    res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: visionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageDataUrl } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(14000),
    });
  } catch {
    throw aiError('ai_unavailable', 503);
  }
  if (!res.ok) throw aiError('ai_unavailable', 503);
  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  const parsed = extractJson(content);
  if (!parsed) throw aiError('ai_unavailable', 503);
  return { data: parsed, model: visionModel };
}

export const UNSAFE_PATTERNS = [
  /赌博|博彩|六合彩|裸聊|约炮|色情|代开发票|刷单兼职|高仿|假证|引流加微|vx[:：\s]*[a-z0-9_-]{5,}/i,
];

export function hasUnsafeText(text) {
  return UNSAFE_PATTERNS.some(rx => rx.test(String(text || '')));
}

export async function generateRoomVibe(rawInput, options = {}) {
  const isSurprise = Boolean(options?.surprise) || String(rawInput || '').trim() === '__random__';
  const avoid = Array.isArray(options?.avoid) ? options.avoid.map(v => String(v || '').trim()).filter(Boolean).slice(0, 8) : [];
  const seed = String(rawInput || '').trim().slice(0, 50);
  const avoidClause = avoid.length ? `请完全避开这些已出现过的主题：${avoid.join('、')}。` : '';
  const today = new Date().toISOString().slice(0, 10);

  const { data: cloud, model } = await callTextLLM(
    '你是「iMoments 拾光房间」的独立摄影策展人与活动策划师。请输出克制、有画面感、不套话的摄影征集方案，只返回合法 JSON（不要任何解释文字或代码块）：{"title":"8到20字有画面感的摄影征集标题","tagline":"20到56字具体、让人想立刻翻相册投稿的一句话导语","theme":"amber|ginkgo|geek|neon|mint 之一","mode":"gentle|ballot|blind 之一","visibility":"public|private","tags":["子分栏1","子分栏2","子分栏3","子分栏4"],"reason":"20字内简述搭配理由"}。每个 tag 2-5 个字且互不重复。',
    isSurprise
      ? `今天是 ${today}，随机种子 ${Math.floor(Math.random() * 100000)}。请完全自由原创一个新颖、有真实生活质感与镜头感的摄影征集活动主题。${avoidClause}`
      : `用户的活动想法：「${seed}」。${avoidClause}请据此生成整套摄影征集房间配置。`,
    isSurprise ? 0.95 : 0.75
  );

  if (!cloud || typeof cloud.tagline !== 'string' || !Array.isArray(cloud.tags) || cloud.tags.length < 3) {
    throw aiError('ai_unavailable', 503);
  }
  const validThemes = ['amber', 'ginkgo', 'geek', 'neon', 'mint'];
  const validModes = ['gentle', 'ballot', 'blind'];
  const tags = [...new Set(cloud.tags.map(t => String(t).trim().slice(0, 10)).filter(Boolean))].slice(0, 4);
  if (tags.length < 3) throw aiError('ai_unavailable', 503);

  return {
    title: String(cloud.title || seed || '此刻光影').trim().slice(0, 40),
    tagline: cloud.tagline.trim().slice(0, 80),
    theme: validThemes.includes(cloud.theme) ? cloud.theme : 'amber',
    mode: validModes.includes(cloud.mode) ? cloud.mode : 'ballot',
    visibility: cloud.visibility === 'private' ? 'private' : 'public',
    tags,
    reason: String(cloud.reason || '已根据主题配齐导语、赛制与分栏。').slice(0, 80),
    engine: 'cloud-llm',
    model,
  };
}

export async function judgeMomentSubmission({ room, tag, place, story, fileName, imageDataUrl }) {
  const combinedText = `${place || ''} ${story || ''} ${fileName || ''}`;
  if (hasUnsafeText(combinedText)) {
    return {
      allowed: false,
      off_topic: false,
      score: 0,
      reason: '检测到疑似推广或不当词汇，请修改文字后重试。',
      caption: '',
      engine: 'safety',
      model: '',
    };
  }

  // Only invoke real multimodal Vision LLM when an actual image preview is supplied
  if (!imageDataUrl || !/^data:image\/(jpeg|png|webp);base64,/.test(imageDataUrl)) {
    return {
      allowed: true,
      off_topic: false,
      score: 0,
      reason: '',
      caption: '',
      engine: 'none',
      model: '',
    };
  }

  const prompt = [
    `你是摄影画廊「iMoments 拾光房间」的视觉策展人。请先仔细观察这张图片的真实画面内容，再对照当前征集房间主题做客观判断：`,
    `- 房间标题：《${room.title}》`,
    `- 征集导语：${room.tagline}`,
    `- 用户所选分栏：${tag || '未选'}`,
    `- 拍摄地点：${place || '未填'}`,
    `- 用户故事：${story || '未填'}`,
    ``,
    `请严格只返回一段 JSON（不要输出其他文字）：`,
    `{"matches":true或false,"reason":"若画面内容与房间主题明显无关，请用25字以内如实说明你看到的画面是什么、为什么偏题；若契合则填空字符串","caption":"20到38字之间，严格基于你真实看到的画面细节写一句克制、有质感的摄影注脚，禁止空洞套话，不要加引号"}`,
  ].join('\n');

  const { data: cloud, model } = await callVisionLLM(imageDataUrl, prompt);
  const matches = cloud?.matches !== false;
  const caption = typeof cloud?.caption === 'string' ? cloud.caption.trim().replace(/^[「“"]|[」”"]$/g, '').slice(0, 60) : '';
  const reason = typeof cloud?.reason === 'string' ? cloud.reason.trim().slice(0, 90) : '';

  return {
    allowed: true,
    off_topic: !matches,
    score: matches ? 92 : 35,
    reason: !matches ? (reason || `画面内容与《${room.title}》主题存在一定偏差。`) : '',
    caption,
    engine: 'cloud-vision',
    model,
  };
}

export async function generateRoomAward({ room, moments, topComments }) {
  if (!moments || moments.length === 0) {
    return '展厅刚刚亮灯，等待第一张瞬间入驻后由 AI 策展人撰写手记。';
  }
  const ranked = [...moments].sort((a, b) =>
    room.mode === 'gentle'
      ? (b.likes - a.likes) || (b.comment_count - a.comment_count)
      : ((b.votes || 0) - (a.votes || 0)) || (b.likes - a.likes)
  );
  const top3 = ranked.slice(0, 3);
  const totalLikes = moments.reduce((s, m) => s + (Number(m.likes) || 0), 0);
  const totalVotes = moments.reduce((s, m) => s + (Number(m.votes) || 0), 0);

  const { data: cloud } = await callTextLLM(
    '你是「iMoments 拾光房间」的首席策展人。请根据当前房间排名前三的作品与评论氛围，只返回 JSON（不要输出其他文字）：{"award":"100到160字之间、克制有温度的本场高光策展小记与前三名点名点评"}。',
    `房间：《${room.title}》（赛制：${room.mode}，共${moments.length}件作品，${totalLikes}次喜欢，${totalVotes}张选票）\n前三名：${top3.map((m, i) => `第${i + 1}名 ${m.author_name}(${m.place || m.tag}, ${m.votes || 0}票/${m.likes}赞): ${m.story || m.ai_caption || '无文字'}`).join('；')}\n精选短评：${(topComments || []).slice(0, 4).map(c => c.body).join(' / ')}`,
    0.78
  );
  if (!cloud || typeof cloud.award !== 'string' || cloud.award.trim().length < 15) {
    throw aiError('ai_unavailable', 503);
  }
  return cloud.award.trim().slice(0, 260);
}
