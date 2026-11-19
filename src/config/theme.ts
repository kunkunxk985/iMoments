export type ThemeId = "amber" | "ginkgo" | "geek" | "neon" | "mint";
export type ModeId = "gentle" | "ballot" | "blind";
export type Visibility = "public" | "private";

export const THEMES: Record<ThemeId, { id: ThemeId; name: string; note: string; stops: [string, string, string]; presets: string[] }> = {
  amber: { id: "amber", name: "落日琥珀", note: "傍晚六点的暖橘", stops: ["#ff7a18", "#ffb03a", "#ffd9a0"], presets: ["城市天际", "海边余晖", "窗边一角", "天空现场"] },
  ginkgo: { id: "ginkgo", name: "银杏暖金", note: "秋天落叶的金", stops: ["#e9b213", "#f6d65c", "#fff0b8"], presets: ["橘座", "玄猫", "三花", "奶猫"] },
  geek: { id: "geek", name: "极客青蓝", note: "屏幕与电路的冷光", stops: ["#0e7fa8", "#22b8cf", "#8fe3e8"], presets: ["整桌全景", "键盘特写", "灯光氛围", "收纳理线"] },
  neon: { id: "neon", name: "赛博霓虹", note: "夜路上的紫与洋红", stops: ["#7a2bff", "#e0409b", "#ff7ac6"], presets: ["霓虹街口", "地铁通勤", "路口人潮", "车窗夜色"] },
  mint: { id: "mint", name: "森林薄荷", note: "营地清晨的绿", stops: ["#12805c", "#35b87f", "#a8e6c1"], presets: ["星空营地", "篝火夜话", "野餐布上", "灯串派对"] },
};
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
export const themeClass = (id: string) => `theme-${THEMES[id as ThemeId] ? id : "amber"}`;

export const MODES: Record<ModeId, { id: ModeId; name: string; short: string; desc: string; rule: string }> = {
  gentle: { id: "gentle", name: "温柔共赏", short: "共赏", desc: "只点赞与短评，不排名次", rule: "这个房间不比较作品。喜欢就点亮一颗心，想说话就留一层楼。" },
  ballot: { id: "ballot", name: "稀缺选票冲榜", short: "5 票冲榜", desc: "每人 5 票，实时金银铜榜", rule: "每位访客在这个房间只有 5 张选票，投出后实时排榜，前三名佩戴金银铜冠。" },
  blind: { id: "blind", name: "盲盒开奖", short: "盲盒", desc: "征集期封存票数，揭晓后开奖", rule: "征集期内票数封存，避免跟风投票。任何人都可以发起揭晓，开奖后榜单立刻公开。" },
};
export const MODE_IDS = Object.keys(MODES) as ModeId[];

export const MEDALS = ["金冠", "银冠", "铜冠"];
export const medalName = (rank: number) => MEDALS[rank - 1] ?? `第 ${rank} 名`;

// The plaza's ambient light follows the real hour: dawn/sunset amber, midday ginkgo, night neon.
export const plazaThemeFor = (hour: number): ThemeId =>
  (hour >= 17 && hour < 19) || (hour >= 5 && hour < 8) ? "amber" : hour >= 19 || hour < 5 ? "neon" : "ginkgo";