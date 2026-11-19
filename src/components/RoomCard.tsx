import { useState } from "react";
import { ArrowUpRightIcon, LockIcon } from "lucide-react";
import type { Room } from "@/src/api";
import { timeAgo } from "@/src/api";
import { MODES, themeClass } from "@/src/config/theme";
import { Avatar } from "@/src/components/bits";
import { navigate } from "@/src/lib/router";

export function RoomCard({ room, index = 0 }: { room: Room; index?: number }) {
  const [loaded, setLoaded] = useState(false);
  const open = () => navigate(`/r/${room.slug}`);
  const tags = room.tags.slice(0, 3);

  return (
    <article
      className={`g-card ${themeClass(room.theme)}${room.visibility === "private" ? " g-card-private" : ""}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      onClick={open}
      onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } }}
      tabIndex={0}
      role="link"
      aria-label={`进入房间：${room.title}`}
    >
      <div className="g-card-cover">
        {room.cover_url ? (
          <img src={room.cover_url} alt={`${room.title} 封面`} loading={index < 6 ? "eager" : "lazy"} decoding="async" onLoad={() => setLoaded(true)} style={{ opacity: loaded ? 1 : 0 }} />
        ) : (
          <span className="g-card-empty"><span>{room.title.slice(0, 1)}</span></span>
        )}
        {room.visibility === "private" ? (
          <div className="g-card-top">
            <span className="g-badge g-badge-dark"><LockIcon />口令房</span>
          </div>
        ) : null}
      </div>
      <div className="g-card-body">
        <div className="g-card-kicker">
          <span className="g-theme-dot" aria-hidden="true" />
          <span>{MODES[room.mode].short}</span>
          <span aria-hidden="true">·</span>
          <span>{room.moment_count} 幅</span>
          <span className="g-card-time">{timeAgo(room.created_at)}</span>
        </div>
        <h3 className="g-card-title">{room.title}</h3>
        <p className="g-card-tagline">{room.tagline}</p>
        <div className="g-card-tags">
          {tags.map(tag => <span key={tag} className="g-tag">{tag}</span>)}
          {room.tags.length > 3 && <span className="g-tag">+{room.tags.length - 3}</span>}
        </div>
        <div className="g-card-foot">
          <span className="g-card-creator">
            <Avatar name={room.creator_name} src={room.creator_avatar} size={20} />
            <b>{room.creator_name}</b>
          </span>
          <span className="g-card-enter">观展<ArrowUpRightIcon /></span>
        </div>
      </div>
    </article>
  );
}
