import { z } from "zod";

export const sections = ["home", "assets", "clips", "streamdeck", "connections", "tools", "mock"] as const;
export const sectionSchema = z.enum(sections);
export type Section = z.infer<typeof sectionSchema>;
export const sectionLabels: Record<Section, string> = {
  home: "Home", assets: "Assets", clips: "Clips", streamdeck: "Stream Deck",
  connections: "Connections", tools: "Tools", mock: "Mock demo",
};
export function parseSection(value: unknown): Section {
  const parsed = sectionSchema.safeParse(value);
  return parsed.success ? parsed.data : "home";
}
export function createNavigation(nav: HTMLElement, panels: Record<Section, HTMLElement>) {
  let current: Section = "home";
  const buttons = sections.map(section => {
    const button = document.createElement("button");
    button.type = "button"; button.textContent = sectionLabels[section]; button.dataset.section = section;
    button.addEventListener("click", () => select(section));
    nav.append(button);
    return { section, button };
  });
  function select(value: unknown, focus = true) {
    current = parseSection(value);
    for (const section of sections) panels[section].hidden = section !== current;
    for (const { section, button } of buttons) {
      if (section === current) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    if (focus) panels[current].querySelector<HTMLElement>("h1")?.focus();
  }
  select("home", false);
  return { select, current: () => current };
}
