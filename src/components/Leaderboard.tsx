import { CrownIcon, EyeOffIcon, GiftIcon, HeartIcon, MessageCircleIcon, SparklesIcon, TicketIcon, WandSparklesIcon } from "lucide-react";
import type { Moment } from "@/src/api";
import { medalName, type ModeId } from "@/src/theme";
import { Avatar, Spinner } from "@/src/components/bits";

export function CuratorAwardBox({
  note, generating, onGenerate, mode,
}: {
  note: string;
  generating: boolean;
  onGenerate: () => void;
  mode: ModeId;
}) {
  return (
    <div className="g-curator-box">
      <div className="g-curator-head">
        <span className="g-curator-icon"><SparklesIcon /></span>
        <div>
          <b>{mode === "gentle" ? "AI 首席策展人 · 共创展览手记" : "AI 首席颁奖官 · 本场高光与 TOP 3 颁奖词"}</b>
          <span>综合实时高票画面、拍摄地坐标与评论区氛围动态撰写</span>
        </div>
        <button type="button" className="g-btn g-btn-sm g-btn-theme" disabled={generating} onClick={onGenerate}>
          {generating ? <Spinner size={13} /> : <WandSparklesIcon />}
          {generating ? "撰写颁奖词中…" : note ? "刷新 AI 颁奖词" : "生成 AI 颁奖词"}
        </button>
      </div>
      {note ? <p className="g-curator-text">{note}</p> : <p className="g-curator-empty">点击右上角按钮，由 AI 首席策展人为当前高光作品实时撰写专属颁奖词。</p>}
    </div>
  );
}

export function Leaderboard({
  moments, mode, revealed, curatorNote, generatingAward, onGenerateAward, onOpen,
}: {
  moments: Moment[]; mode: ModeId; revealed: boolean;
  curatorNote: string; generatingAward: boolean; onGenerateAward: () => void;
  onOpen: (id: string) => void;
}) {
  const sealed = mode === "blind" && !revealed;
  const ranked = moments.filter(moment => moment.votes !== null).sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0) || b.likes - a.likes);
  const total = ranked.reduce((sum, moment) => sum + (moment.votes ?? 0), 0);
  const max = Math.max(1, ...ranked.map(moment => moment.votes ?? 0));

  if (sealed) {
    return (
      <div className="g-rank">
        <CuratorAwardBox note={curatorNote} generating={generatingAward} onGenerate={onGenerateAward} mode={mode} />
        <div className="g-empty">
          <span className="g-empty-mark"><EyeOffIcon /></span>
          <h3>票数封存中，榜单尚未开启</h3>
          <p>盲盒开奖模式在征集期内隐藏每张作品的具体票数，避免跟风投票。发起揭晓后，这里会立刻按票数排出金银铜与完整榜单。</p>
        </div>
      </div>
    );
  }
  if (!ranked.length) {
    return (
      <div className="g-empty">
        <span className="g-empty-mark"><GiftIcon /></span>
        <h3>还没有作品参与冲榜</h3>
        <p>上传第一张瞬间，或为已有作品投出宝贵的一票，榜单会实时出现。</p>
      </div>
    );
  }

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="g-rank">
      <CuratorAwardBox note={curatorNote} generating={generatingAward} onGenerate={onGenerateAward} mode={mode} />

      <div className="g-strip-head" style={{ marginBottom: 0 }}>
        <TicketIcon width={16} height={16} />
        <h2>实时荣誉排行榜</h2>
        <span>{ranked.length} 张作品 · 累计 {total} 票 · 每位访客 5 票</span>
      </div>

      <div className="g-podium">
        {podium.map((moment, index) => (
          <button key={moment.id} type="button" className="g-podium-item" data-medal={index + 1} onClick={() => onOpen(moment.id)} style={{ animationDelay: `${index * 90}ms` }}>
            <div className="g-podium-media">
              {moment.thumb_url ? <img src={moment.thumb_url} alt={moment.story || moment.author_name} loading="lazy" decoding="async" /> : null}
              <span className="g-medal" data-medal={index + 1}><CrownIcon /></span>
              <span className="g-podium-votes"><b>{moment.votes}</b><span>票 · {medalName(index + 1)}</span></span>
            </div>
            <div className="g-podium-body">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar name={moment.author_name} src={moment.author_avatar} small />
                <b>{moment.author_name}</b>
                <span className="g-podium-ai"><SparklesIcon width={11} height={11} />{moment.ai_score}%</span>
              </span>
              <p>{moment.story}</p>
              {moment.ai_caption ? <p className="g-podium-caption">✦ {moment.ai_caption}</p> : null}
              <span style={{ display: "flex", gap: 12, fontSize: 11.6, color: "var(--site-muted)" }}>
                <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><HeartIcon width={12} height={12} />{moment.likes}</span>
                <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><MessageCircleIcon width={12} height={12} />{moment.comment_count}</span>
                <span className="g-tag" style={{ marginLeft: "auto" }}>{moment.tag}</span>
              </span>
            </div>
          </button>
        ))}
      </div>

      {rest.length ? (
        <div className="g-rank-list">
          {rest.map((moment, index) => (
            <button key={moment.id} type="button" className="g-rank-row" onClick={() => onOpen(moment.id)}>
              <span className="g-rank-no">{index + 4}</span>
              <span className="g-rank-thumb">{moment.thumb_url ? <img src={moment.thumb_url} alt="" loading="lazy" decoding="async" /> : null}</span>
              <span className="g-rank-main">
                <b>{moment.author_name} · {moment.tag}</b>
                <span>{moment.ai_caption || moment.place || moment.story}</span>
                <span className="g-rank-bar"><i style={{ width: `${Math.round(((moment.votes ?? 0) / max) * 100)}%` }} /></span>
              </span>
              <span className="g-rank-votes"><b>{moment.votes}</b><span>票</span></span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
