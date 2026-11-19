import { accountToken, visitorKey, type CachedAccount } from "@/src/lib/visitor";
import type { ImageTelemetry } from "@/src/lib/image";
import { cacheMomentAi, getCachedMomentAi, localGenerateAward, localGenerateVibe, localJudgeSubmission, SEED_MOMENT_AI, SEED_ROOM_NOTES } from "@/src/lib/aiFallback";
import type { ModeId, ThemeId, Visibility } from "@/src/theme";

export type Account = CachedAccount;

export type Room = {
  id: string; slug: string; title: string; tagline: string; visibility: Visibility; mode: ModeId; theme: ThemeId;
  tags: string[]; revealed: boolean; ai_curator_note: string;
  creator_name: string; creator_avatar: string; creator_handle: string; creator_uid: string;
  moment_count: number; created_at: string;
  cover_url: string | null; is_creator: boolean; code: string | null; share_code: string | null;
};
export type Moment = {
  id: string; author_name: string; author_avatar: string; author_handle: string; author_uid: string;
  place: string; tag: string; story: string; width: number; height: number;
  original_width: number; original_height: number; has_original: boolean;
  ai_score: number; ai_caption: string;
  likes: number; comment_count: number; votes: number | null; rank: number | null; created_at: string;
  seed_key: string | null; image_url: string | null; thumb_url: string | null; original_url: string | null;
  liked: boolean; voted: boolean; mine: boolean; can_delete: boolean;
};
export type Comment = {
  id: string; moment_id?: string; author_name: string; author_avatar?: string;
  body: string; floor: number; created_at: string;
};
export type Me = { liked: string[]; voted: string[]; used: number; remaining: number; authenticated?: boolean; name?: string; avatar_url?: string };
export type MeProfile = {
  id: string | null; name: string; avatar_url: string; authenticated: boolean;
  account: Account | null; stats: { rooms: number; moments: number };
};
export type RoomView = {
  room: Room; moments: Moment[]; me: Me;
  stats: { moments: number; participants: number; likes: number; votes: number | null };
};
export type Plaza = { rooms: Room[]; unlocked: Room[]; stats: { rooms: number; moments: number } };
export type MomentDetail = { moment: Moment; comments: Comment[]; me: Me; room: { slug: string; mode: ModeId; theme: ThemeId; revealed: boolean; title: string } };
export type UploadIntent = {
  id: string;
  full: { signedUrl: string };
  thumb: { signedUrl: string };
  original: { signedUrl: string } | null;
  ai_score: number;
  ai_caption: string;
};
export type RoomVibe = {
  title: string; tagline: string; theme: ThemeId; mode: ModeId; visibility: Visibility; tags: string[]; reason: string;
};
export type AiJudgeVerdict = {
  allowed: boolean; off_topic: boolean; score: number; reason: string; caption: string;
};

export class RequestError extends Error {
  constructor(public code: string, public status = 0, public uncertain = false) { super(code); }
}

type Options = { method?: string; body?: unknown; code?: string | null; key?: string; signal?: AbortSignal };

export async function request(path: string, options: Options = {}): Promise<unknown> {
  const headers: Record<string, string> = { "x-visitor-key": visitorKey() };
  const token = accountToken();
  if (token) headers["x-account-token"] = token;
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.code) headers["x-room-code"] = options.code;
  if (options.key) headers["idempotency-key"] = options.key;
  let response: Response;
  try {
    response = await fetch(`/functions/v1/app${path}`, {
      method: options.method ?? "GET",
      headers,
      credentials: "same-origin",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal ?? AbortSignal.timeout(25_000),
    });
  } catch { throw new RequestError("network_error", 0, true); }
  let body: unknown;
  try { body = await response.json(); } catch { throw new RequestError("invalid_response", response.status, true); }
  if (!response.ok) {
    const code = typeof (body as { error?: unknown })?.error === "string" ? (body as { error: string }).error : "request_failed";
    throw new RequestError(code, response.status, response.status >= 500 || response.status === 408);
  }
  return body;
}

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const str = (value: unknown, fallback = ""): string => typeof value === "string" ? value : fallback;
const num = (value: unknown, fallback = 0): number => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const nullableNum = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const bool = (value: unknown): boolean => value === true;
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const strings = (value: unknown): string[] => list(value).filter((item): item is string => typeof item === "string");

function parseAccount(value: unknown): Account | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.handle !== "string") return null;
  return {
    id: value.id,
    uid: str(value.uid),
    handle: value.handle,
    display_name: str(value.display_name),
    avatar_url: str(value.avatar_url),
    bio: str(value.bio),
    unlocked_codes: strings(value.unlocked_codes),
    created_at: str(value.created_at),
  };
}

function room(value: unknown): Room {
  if (!isRecord(value) || typeof value.slug !== "string") throw new RequestError("invalid_response");
  const serverNote = str(value.ai_curator_note);
  return {
    id: str(value.id), slug: value.slug, title: str(value.title), tagline: str(value.tagline),
    visibility: value.visibility === "private" ? "private" : "public",
    mode: (["gentle", "ballot", "blind"].includes(str(value.mode)) ? value.mode : "gentle") as ModeId,
    theme: (["amber", "ginkgo", "geek", "neon", "mint"].includes(str(value.theme)) ? value.theme : "amber") as ThemeId,
    tags: strings(value.tags), revealed: bool(value.revealed),
    ai_curator_note: serverNote || SEED_ROOM_NOTES[value.slug] || "",
    creator_name: str(value.creator_name),
    creator_avatar: str(value.creator_avatar),
    creator_handle: str(value.creator_handle),
    creator_uid: str(value.creator_uid),
    moment_count: num(value.moment_count), created_at: str(value.created_at),
    cover_url: typeof value.cover_url === "string" ? value.cover_url : null,
    is_creator: bool(value.is_creator),
    code: typeof value.code === "string" ? value.code : null,
    share_code: typeof value.share_code === "string" ? value.share_code : null,
  };
}
function moment(value: unknown): Moment {
  if (!isRecord(value) || typeof value.id !== "string") throw new RequestError("invalid_response");
  const w = num(value.width);
  const h = num(value.height);
  const seedKey = typeof value.seed_key === "string" ? value.seed_key : null;
  const seedMeta = seedKey ? SEED_MOMENT_AI[seedKey] : undefined;
  const cached = getCachedMomentAi(value.id);
  const imageUrl = typeof value.image_url === "string" ? value.image_url : null;
  return {
    id: value.id,
    author_name: str(value.author_name),
    author_avatar: str(value.author_avatar),
    author_handle: str(value.author_handle),
    author_uid: str(value.author_uid),
    place: str(value.place), tag: str(value.tag), story: str(value.story),
    width: w, height: h,
    original_width: num(value.original_width, cached?.origW ?? w),
    original_height: num(value.original_height, cached?.origH ?? h),
    has_original: value.has_original === undefined ? Boolean(seedKey || cached?.origW) : bool(value.has_original),
    ai_score: num(value.ai_score, cached?.score ?? seedMeta?.score ?? 94),
    ai_caption: str(value.ai_caption) || cached?.caption || seedMeta?.caption || "",
    likes: num(value.likes), comment_count: num(value.comment_count),
    votes: nullableNum(value.votes), rank: nullableNum(value.rank), created_at: str(value.created_at),
    seed_key: seedKey,
    image_url: imageUrl,
    thumb_url: typeof value.thumb_url === "string" ? value.thumb_url : null,
    original_url: typeof value.original_url === "string" ? value.original_url : imageUrl,
    liked: bool(value.liked), voted: bool(value.voted), mine: bool(value.mine),
    can_delete: value.can_delete === undefined ? bool(value.mine) : bool(value.can_delete),
  };
}
function comment(value: unknown): Comment {
  if (!isRecord(value) || typeof value.id !== "string") throw new RequestError("invalid_response");
  return {
    id: value.id,
    moment_id: typeof value.moment_id === "string" ? value.moment_id : undefined,
    author_name: str(value.author_name),
    author_avatar: str(value.author_avatar),
    body: str(value.body), floor: num(value.floor), created_at: str(value.created_at),
  };
}
function me(value: unknown): Me {
  const row = isRecord(value) ? value : {};
  return {
    liked: strings(row.liked), voted: strings(row.voted),
    used: num(row.used), remaining: num(row.remaining, 5),
    authenticated: bool(row.authenticated), name: str(row.name), avatar_url: str(row.avatar_url),
  };
}
function signed(value: unknown): string {
  const url = isRecord(value) ? str(value.signedUrl) : "";
  if (!url.startsWith("/storage/v1/") || /[\\\r\n]/.test(url)) throw new RequestError("invalid_response");
  return url;
}

export const api = {
  async me(signal?: AbortSignal): Promise<MeProfile> {
    const body = await request("/api/me", { signal });
    if (!isRecord(body)) throw new RequestError("invalid_response");
    const stats = isRecord(body.stats) ? body.stats : {};
    return {
      id: typeof body.id === "string" ? body.id : null,
      name: str(body.name),
      avatar_url: str(body.avatar_url),
      authenticated: bool(body.authenticated),
      account: parseAccount(body.account),
      stats: { rooms: num(stats.rooms), moments: num(stats.moments) },
    };
  },
  async register(payload: { handle: string; password: string; display_name: string; avatar_url: string; bio?: string; unlocked_codes?: string[] }): Promise<{ token: string; account: Account }> {
    const body = await request("/api/auth/register", { method: "POST", body: payload });
    if (!isRecord(body) || typeof body.token !== "string") throw new RequestError("invalid_response");
    const acc = parseAccount(body.account);
    if (!acc) throw new RequestError("invalid_response");
    return { token: body.token, account: acc };
  },
  async login(payload: { handle: string; password: string; unlocked_codes?: string[] }): Promise<{ token: string; account: Account }> {
    const body = await request("/api/auth/login", { method: "POST", body: payload });
    if (!isRecord(body) || typeof body.token !== "string") throw new RequestError("invalid_response");
    const acc = parseAccount(body.account);
    if (!acc) throw new RequestError("invalid_response");
    return { token: body.token, account: acc };
  },
  async logout(): Promise<void> {
    await request("/api/auth/logout", { method: "POST" });
  },
  async updateProfile(payload: { display_name?: string; avatar_url?: string; bio?: string }): Promise<Account> {
    const body = await request("/api/auth/profile", { method: "POST", body: payload });
    if (!isRecord(body)) throw new RequestError("invalid_response");
    const acc = parseAccount(body.account);
    if (!acc) throw new RequestError("invalid_response");
    return acc;
  },
  async aiVibe(prompt: string): Promise<RoomVibe> {
    try {
      const body = await request("/api/ai/vibe", { method: "POST", body: { prompt } });
      if (!isRecord(body) || !isRecord(body.vibe)) throw new RequestError("invalid_response");
      const v = body.vibe;
      return {
        title: str(v.title),
        tagline: str(v.tagline),
        theme: (["amber", "ginkgo", "geek", "neon", "mint"].includes(str(v.theme)) ? v.theme : "amber") as ThemeId,
        mode: (["gentle", "ballot", "blind"].includes(str(v.mode)) ? v.mode : "ballot") as ModeId,
        visibility: v.visibility === "private" ? "private" : "public",
        tags: strings(v.tags).slice(0, 4),
        reason: str(v.reason),
      };
    } catch (err) {
      if (err instanceof RequestError && err.status === 404) return localGenerateVibe(prompt);
      throw err;
    }
  },
  async aiJudge(slug: string, code: string | null, roomMeta: { title: string; theme: ThemeId }, payload: { tag: string; place: string; story: string; file_name: string; telemetry: ImageTelemetry }): Promise<AiJudgeVerdict> {
    try {
      const body = await request(`/api/rooms/${slug}/ai-judge`, { method: "POST", code, body: payload });
      if (!isRecord(body) || !isRecord(body.verdict)) throw new RequestError("invalid_response");
      const v = body.verdict;
      return {
        allowed: bool(v.allowed),
        off_topic: bool(v.off_topic),
        score: num(v.score, 92),
        reason: str(v.reason),
        caption: str(v.caption),
      };
    } catch (err) {
      if (err instanceof RequestError && err.status === 404) {
        return localJudgeSubmission(roomMeta.title, roomMeta.theme, payload);
      }
      throw err;
    }
  },
  async aiAward(slug: string, code: string | null, fallbackCtx: { title: string; mode: ModeId; revealed: boolean; moments: Moment[] }): Promise<string> {
    try {
      const body = await request(`/api/rooms/${slug}/ai-award`, { method: "POST", code, body: {} });
      if (!isRecord(body)) throw new RequestError("invalid_response");
      return str(body.ai_curator_note);
    } catch (err) {
      if (err instanceof RequestError && err.status === 404) {
        return localGenerateAward(fallbackCtx.title, fallbackCtx.mode, fallbackCtx.revealed, fallbackCtx.moments);
      }
      throw err;
    }
  },
  async roomFeed(slug: string, code: string | null, momentsFallback: Moment[], signal?: AbortSignal): Promise<Comment[]> {
    try {
      const body = await request(`/api/rooms/${slug}/feed`, { code, signal });
      if (!isRecord(body)) throw new RequestError("invalid_response");
      return list(body.comments).map(comment);
    } catch (err) {
      if (err instanceof RequestError && err.status === 404) {
        const top = momentsFallback.slice(0, 4);
        const batches = await Promise.all(top.map(m => api.comments(m.id, code, signal).catch(() => [])));
        return batches.flat().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 20);
      }
      throw err;
    }
  },
  async plaza(codes: string[], signal?: AbortSignal): Promise<Plaza> {
    const query = codes.length ? `?codes=${encodeURIComponent(codes.join(","))}` : "";
    const body = await request(`/api/rooms${query}`, { signal });
    if (!isRecord(body)) throw new RequestError("invalid_response");
    return {
      rooms: list(body.rooms).map(room), unlocked: list(body.unlocked).map(room),
      stats: { rooms: num(isRecord(body.stats) ? body.stats.rooms : 0), moments: num(isRecord(body.stats) ? body.stats.moments : 0) },
    };
  },
  async createRoom(payload: { title: string; tagline: string; visibility: Visibility; mode: ModeId; theme: ThemeId; tags: string[]; creator_name: string }, key: string): Promise<Room> {
    const body = await request("/api/rooms", { method: "POST", body: payload, key });
    if (!isRecord(body)) throw new RequestError("invalid_response");
    return room(body.room);
  },
  async unlock(code: string): Promise<Room> {
    const body = await request("/api/rooms/unlock", { method: "POST", body: { code } });
    if (!isRecord(body)) throw new RequestError("invalid_response");
    return room(body.room);
  },
  async room(slug: string, code: string | null, signal?: AbortSignal): Promise<RoomView> {
    const body = await request(`/api/rooms/${slug}`, { code, signal });
    if (!isRecord(body)) throw new RequestError("invalid_response");
    const stats = isRecord(body.stats) ? body.stats : {};
    return {
      room: room(body.room), moments: list(body.moments).map(moment), me: me(body.me),
      stats: { moments: num(stats.moments), participants: num(stats.participants), likes: num(stats.likes), votes: nullableNum(stats.votes) },
    };
  },
  async reveal(slug: string, code: string | null): Promise<void> {
    await request(`/api/rooms/${slug}/reveal`, { method: "POST", code });
  },
  async moment(id: string, code: string | null, signal?: AbortSignal): Promise<MomentDetail> {
    const body = await request(`/api/moments/${id}`, { code, signal });
    if (!isRecord(body)) throw new RequestError("invalid_response");
    const detail = isRecord(body.room) ? body.room : {};
    return {
      moment: moment(body.moment), comments: list(body.comments).map(comment), me: me(body.me),
      room: { slug: str(detail.slug), mode: str(detail.mode, "gentle") as ModeId, theme: str(detail.theme, "amber") as ThemeId, revealed: bool(detail.revealed), title: str(detail.title) },
    };
  },
  async like(id: string, code: string | null): Promise<{ liked: boolean; likes: number }> {
    const body = await request(`/api/moments/${id}/like`, { method: "POST", code });
    if (!isRecord(body)) throw new RequestError("invalid_response");
    return { liked: bool(body.liked), likes: num(body.likes) };
  },
  async vote(id: string, code: string | null, cast: boolean): Promise<{ voted: boolean; votes: number | null; remaining: number }> {
    const body = await request(`/api/moments/${id}/${cast ? "vote" : "unvote"}`, { method: "POST", code });
    if (!isRecord(body)) throw new RequestError("invalid_response");
    return { voted: bool(body.voted), votes: nullableNum(body.votes), remaining: num(body.remaining) };
  },
  async comments(id: string, code: string | null, signal?: AbortSignal): Promise<Comment[]> {
    const body = await request(`/api/moments/${id}/comments`, { code, signal });
    if (!isRecord(body)) throw new RequestError("invalid_response");
    return list(body.comments).map(comment);
  },
  async postComment(id: string, code: string | null, payload: { author_name: string; body: string }): Promise<Comment> {
    const body = await request(`/api/moments/${id}/comments`, { method: "POST", code, body: payload });
    if (!isRecord(body)) throw new RequestError("invalid_response");
    return comment(body.comment);
  },
  async uploadIntent(slug: string, code: string | null, payload: {
    author_name: string; place: string; tag: string; story: string;
    width: number; height: number; size: number; thumb_size: number; content_type: string;
    keep_original?: boolean; original_size?: number; original_width?: number; original_height?: number; original_type?: string;
    file_name?: string; telemetry?: ImageTelemetry; ai_score?: number; ai_caption?: string; force_keep?: boolean;
  }): Promise<UploadIntent> {
    const body = await request(`/api/rooms/${slug}/uploads`, { method: "POST", code, body: payload });
    if (!isRecord(body) || typeof body.id !== "string") throw new RequestError("invalid_response");
    const score = num(body.ai_score, payload.ai_score ?? 94);
    const caption = str(body.ai_caption) || payload.ai_caption || "";
    cacheMomentAi(body.id, score, caption, payload.original_width ?? payload.width, payload.original_height ?? payload.height);
    return {
      id: body.id,
      full: { signedUrl: signed(body.full) },
      thumb: { signedUrl: signed(body.thumb) },
      original: isRecord(body.original) && typeof body.original.signedUrl === "string" ? { signedUrl: signed(body.original) } : null,
      ai_score: score,
      ai_caption: caption,
    };
  },
  async complete(id: string, code: string | null): Promise<{ id: string; status: string; slug?: string }> {
    const body = await request(`/api/moments/${id}/complete`, { method: "POST", code });
    if (!isRecord(body) || typeof body.id !== "string") throw new RequestError("invalid_response");
    return { id: body.id, status: str(body.status), slug: typeof body.slug === "string" ? body.slug : undefined };
  },
  async deleteMoment(id: string, code: string | null): Promise<void> {
    await request(`/api/moments/${id}/delete`, { method: "POST", code });
  },
};

export function transfer(signedUrl: string, blob: Blob, onProgress?: (ratio: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", blob.type || "image/jpeg");
    xhr.timeout = 120_000;
    xhr.upload.onprogress = event => { if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new RequestError(xhr.status === 409 ? "object_exists" : "upload_failed", xhr.status, xhr.status >= 500));
    xhr.onerror = () => reject(new RequestError("network_error", 0, true));
    xhr.ontimeout = () => reject(new RequestError("network_error", 0, true));
    xhr.send(blob);
  });
}

export function message(error: unknown): string {
  const code = error instanceof RequestError ? error.code : "";
  return ({
    visitor_required: "请先刷新页面取得访客身份，再试一次。",
    invalid_input: "内容不符合要求，请检查后重试。",
    invalid_handle: "账号 ID 需为 3–20 位小写字母、数字或下划线（如 ikun_2026）。",
    invalid_password: "密码长度需在 6–64 位之间。",
    handle_taken: "这个账号 ID 已经被占用了，换一个试试，或直接切换到登录。",
    invalid_credentials: "账号 ID 或密码不正确，请核对后重试。",
    invalid_avatar: "头像图片过大或格式不支持，请重新选择图片。",
    payload_too_large: "提交的内容太长了，请精简后重试。",
    not_found: "这个房间或作品已经不存在了。",
    room_locked: "这是私密口令房，输入 4 位口令后才能进入。",
    code_not_found: "没有找到这个口令对应的房间，请核对 4 位数字。",
    too_many_attempts: "尝试次数过多，请 15 分钟后再试。",
    invalid_mode: "当前赛制不支持这个操作。",
    no_ballots_left: "你在这个房间的 5 张选票已经用完，可以撤回一张再投。",
    already_voted: "你已经为这张作品投过票了。",
    not_voted: "你还没有为这张作品投票。",
    write_conflict: "刚刚有人同时更新了数据，已为你保留操作，请再试一次。",
    idempotency_conflict: "这次创建与之前的内容不一致，请核对已有房间。",
    room_limit_reached: "你创办的房间已达 30 个上限。",
    room_full: "这个房间的作品已满 200 张。",
    comment_limit_reached: "短评数量已达上限。",
    unsafe_content: "AI 安全守门员拦截：检测到疑似推广或不当词汇，请修改后重试。",
    off_topic_moment: "AI 命题契合度裁判提示该图片与房间主题偏离较大，请换一张契合照片或勾选强行留存。",
    invalid_upload: "图片格式或大小不符合要求（JPEG / PNG / WebP，原图不超过 10 MB）。",
    upload_pending: "图片还没确认入库，请点击「继续完成上传」核对，不要重新上传。",
    object_exists: "这份图片已经上传过了，请直接完成确认。",
    upload_failed: "图片传输失败，请重试。",
    storage_unavailable: "文件服务暂时不可用，请稍后重试。",
    database_unavailable: "数据服务暂时不可用，请稍后重试。",
    database_not_configured: "站点数据服务尚未配置完成。",
    database_credential_rejected: "数据服务暂不可用，请联系站点管理员。",
    code_unavailable: "暂时没能分配到不重复的房间号，请再试一次。",
    response_lost: "操作结果未知，请先核对，不要重复提交。",
    network_error: "连接中断，尚无法确认本次操作的结果。",
    invalid_response: "服务返回了无法识别的结果，请重新加载。",
    forbidden: "这个操作只能由上传者本人完成。",
    login_required: "请先登录拾光账号后再试。",
    invalid_user_context: "登录状态已失效，请刷新页面。",
  } as Record<string, string>)[code] ?? "暂时无法完成操作，请稍后重试。";
}

export function timeAgo(iso: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  const diff = Date.now() - time;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return new Date(time).toLocaleDateString("zh-CN", { month: "long", day: "numeric" });
}
