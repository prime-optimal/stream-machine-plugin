import { z } from "zod";

export const sections = ["home", "assets", "clips", "streamdeck", "connections", "tools", "mock"] as const;
export const sectionSchema = z.enum(sections);
export type Section = z.infer<typeof sectionSchema>;
export const sectionLabels: Record<Section, string> = {
  home: "Home", assets: "Assets", clips: "Clips", streamdeck: "Stream Deck",
  connections: "Connections", tools: "Tools", mock: "Mock demo",
};
export const runtimeSchema = z.enum(["hosted", "local"]);
export type Runtime = z.infer<typeof runtimeSchema>;
export const openSchema = z.object({
  runtime: runtimeSchema,
  siteOrigin: z.string().refine(value => { try { const url = new URL(value); return url.protocol === "https:" && url.origin === value; } catch { return false; } }),
});
export const hostedSections: readonly Section[] = ["home", "clips", "connections", "tools"];
export function visibleSections(runtime: Runtime): readonly Section[] {
  return runtime === "hosted" ? hostedSections : sections;
}
export function parseSection(value: unknown): Section {
  const parsed = sectionSchema.safeParse(value);
  return parsed.success ? parsed.data : "home";
}
export function createNavigation(nav: HTMLElement, panels: Record<Section, HTMLElement>, onChange: (section: Section) => void = () => {}) {
  let current: Section = "home";
  let visible: readonly Section[] = sections;
  const buttons = sections.map(section => {
    const button = document.createElement("button");
    button.type = "button"; button.textContent = sectionLabels[section]; button.dataset.section = section;
    button.addEventListener("click", () => select(section));
    nav.append(button);
    return { section, button };
  });
  function select(value: unknown, focus = true) {
    const requested = parseSection(value);
    current = visible.includes(requested) ? requested : "home";
    onChange(current);
    for (const section of sections) panels[section].hidden = section !== current;
    for (const { section, button } of buttons) {
      if (section === current) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    if (focus) panels[current].querySelector<HTMLElement>("h1")?.focus();
  }
  function show(next: readonly Section[]) {
    visible = next;
    for (const { section, button } of buttons) button.hidden = !visible.includes(section);
    select(visible.includes(current) ? current : "home", false);
  }
  select("home", false);
  return { select, show, current: () => current };
}
