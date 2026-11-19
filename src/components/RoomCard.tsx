import { useState } from "react";
import { ArrowRightIcon, GlobeIcon, ImageIcon, LockIcon } from "lucide-react";
import type { Room } from "@/src/api";
import { timeAgo } from "@/src/api";
import { themeClass } from "@/src/theme";
import { Avatar, ModeBadge } from "@/src/components/bits";
import { navigate } from "@/src/lib/router";

export function RoomCard({ room, index = 0 }: { room: Room; index?: number }) {
  const [loaded, setLoaded] = useState(false);
  const open = () => navigate(`/r/${room.slug}`);
  const tags = room.tags.slice(0, 3);

  return (
    <article
      className={`g-card ${themeClass(room.theme)}${room.visibility === "private" ? " g-card-private" : ""}`}
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
      onClick={open}
      onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } }}
      tabIndex={0}
      role="link"
      aria-label={`进入房间：${room.title}`}
    >
      <div className="g-card-cover">
        <span className="g-card-bar" />
        {room.cover_url ? (
          <img src={room.cover_url} alt={`${room.title} 封面`} loading={index < 6 ? "eager" : "lazy"} decoding="async" onLoad={() => setLoaded(true)} style={{ opacity: loaded ? 1 : 0 }} />
        ) : (
          <span className="g-card-empty"><span>{room.title.slice(0, 1)}</span></span>
        )}
        <div className="g-card-top">
          <ModeBadge mode={room.mode} solid />
          <span className="g-badge g-badge-dark">{room.visibility === "private" ? <LockIcon /> : <GlobeIcon />}{room.visibility === "private" ? "口令房" : "公开"}</span>
        </div>
        <div className="g-card-bottom">
          <ImageIcon />{room.moment_count} 张作品
          <span style={{ opacity: .7 }}>· {timeAgo(room.created_at)}创办</span>
        </div>
      </div>
      <div className="g-card-body">
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
          <span className="g-card-enter">进入房间<ArrowRightIcon /></span>
        </div>
      </div>
    </article>
  );
}
