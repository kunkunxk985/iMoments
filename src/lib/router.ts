import { useEffect, useState } from "react";

export type Route = { name: "plaza" | "room"; slug: string | null; params: URLSearchParams };

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = raw.split("?");
  const params = new URLSearchParams(query);
  const match = path.match(/^\/r\/([a-z0-9-]{3,40})$/);
  return match ? { name: "room", slug: match[1], params } : { name: "plaza", slug: null, params };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

function build(path: string, params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const query = search.toString();
  return `#${path}${query ? `?${query}` : ""}`;
}

export function navigate(path: string, params: Record<string, string | null | undefined> = {}) {
  const next = build(path, params);
  if (window.location.hash === next) return;
  window.location.hash = next;
  window.scrollTo({ top: 0, behavior: "auto" });
}

export function setParams(patch: Record<string, string | null | undefined>) {
  const route = parse();
  const merged: Record<string, string | null | undefined> = {};
  route.params.forEach((value, key) => { merged[key] = value; });
  Object.assign(merged, patch);
  const path = route.name === "room" ? `/r/${route.slug}` : "/";
  const next = build(path, merged);
  if (window.location.hash !== next) window.location.hash = next;
}

export const roomHref = (slug: string) => `#/r/${slug}`;
export const plazaHref = "#/";