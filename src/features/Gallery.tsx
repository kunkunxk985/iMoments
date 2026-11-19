import { useState } from "react";
import { CrownIcon, EyeOffIcon, HeartIcon, MapPinIcon, MessageCircleIcon, TicketIcon } from "lucide-react";
import type { Moment } from "@/src/api";
import { MODES, type ModeId } from "@/src/config/theme";
import { Avatar, Medal } from "@/src/components/bits";

export type ShotActions = {
  onOpen: (id: string) => void;
  onLike: (id: string) => void;
  onVote: (id: string, cast: boolean) => void;
  pending: Set<string>;
};

export function ShotCard({ moment, rank, mode, revealed, remaining, actions, index }: {
  moment: Moment; rank: number | null; mode: ModeId; revealed: boolean; remaining: number; actions: ShotActions; index: number;
}) {
  const [loaded, setLoaded] = useState(false);
  const [bump, setBump] = useState<"like" | "vote" | null>(null);
  const ratio = moment.width > 0 && moment.height > 0 ? `${moment.width} / ${moment.height}` : "3 / 2";
  const canVote = mode !== "gentle";
  const sealed = mode === "blind" && !revealed;
  const busy = actions.pending.has(moment.id);
  const pulse = (kind: "like" | "vote") => { setBump(kind); window.setTimeout(() => setBump(null), 460); };

  return (
    <article
      className="g-shot"
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
      onClick={() => actions.onOpen(moment.id)}
      onKeyDown={event => { if (event.key === "Enter") actions.onOpen(moment.id); }}
      tabIndex={0}
      aria-label={`查看大图：${moment.author_name} 的瞬间`}
    >
      <div className="g-shot-media" data-loading={!loaded} style={{ aspectRatio: ratio }}>
        {!loaded ? <span className="g-shot-skeleton" /> : null}
        {moment.thumb_url ? (
          <img src={moment.thumb_url} alt={moment.story || `${moment.author_name} 的摄影作品`} loading={index < 6 ? "eager" : "lazy"} decoding="async" onLoad={() => setLoaded(true)} />
        ) : null}
        {rank && rank <= 3 ? <Medal rank={rank} /> : null}
        <span className="g-shot-tag g-badge g-badge-dark">{moment.tag}</span>
        {moment.story ? <div className="g-shot-overlay"><p className="g-shot-story">{moment.story}</p></div> : null}
      </div>
      <div className="g-shot-body">
        {moment.ai_caption ? (
          <p className="g-shot-ai-caption" title="拍立得旁白">
            <span>{moment.ai_caption}</span>
          </p>
        ) : null}
        <div className="g-shot-author">
          <Avatar name={moment.author_name} src={moment.author_avatar} small />
          <b>{moment.author_name}</b>
          {moment.place ? <span className="g-shot-place"><MapPinIcon /><span>{moment.place}</span></span> : null}
        </div>
        <div className="g-shot-actions">
          <button
            type="button" className="g-act" data-on={moment.liked} data-bump={bump === "like"} disabled={busy}
            aria-pressed={moment.liked} aria-label={moment.liked ? "取消喜欢" : "喜欢这张作品"}
            onClick={event => { event.stopPropagation(); pulse("like"); actions.onLike(moment.id); }}
          >
            <HeartIcon fill={moment.liked ? "currentColor" : "none"} />{moment.likes}
          </button>
          {canVote ? (
            <>
              <button
                type="button" className="g-act g-act-vote" data-on={moment.voted} data-bump={bump === "vote"}
                disabled={busy || (!moment.voted && remaining <= 0)}
                aria-pressed={moment.voted}
                title={moment.voted ? "撤回这张选票" : sealed ? "投出一票（征集期内票数封存）" : remaining > 0 ? `投出一张选票（剩 ${remaining} 张）` : "选票已用完"}
                onClick={event => { event.stopPropagation(); pulse("vote"); actions.onVote(moment.id, !moment.voted); }}
              >
                {moment.voted ? <CrownIcon /> : <TicketIcon />}{sealed ? (moment.voted ? "已投" : "投票") : (moment.votes ?? 0)}
              </button>
              {sealed ? <span className="g-sealed-count"><EyeOffIcon />封存</span> : null}
            </>
          ) : null}
          <span className="g-act g-act-spacer" style={{ cursor: "pointer" }} onClick={event => { event.stopPropagation(); actions.onOpen(moment.id); }}>
            <MessageCircleIcon />{moment.comment_count}
          </span>
        </div>
      </div>
    </article>
  );
}

export function Gallery({ moments, ranks, mode, revealed, remaining, actions }: {
  moments: Moment[]; ranks: Map<string, number>; mode: ModeId; revealed: boolean; remaining: number; actions: ShotActions;
}) {
  const density = moments.length === 1 ? "single" : moments.length === 2 ? "pair" : "many";
  return (
    <div className="g-masonry" data-density={density}>
      {moments.map((moment, index) => (
        <ShotCard
          key={moment.id} moment={moment} index={index} mode={mode} revealed={revealed} remaining={remaining}
          rank={ranks.get(moment.id) ?? null} actions={actions}
        />
      ))}
      {moments.length === 0 ? (
        <p style={{ color: "var(--site-muted)", fontSize: 13.5, lineHeight: 1.8 }}>
          这个子分栏还没有作品。{MODES[mode].name}模式下，第一张上传的瞬间会成为房间封面。
        </p>
      ) : null}
    </div>
  );
}
