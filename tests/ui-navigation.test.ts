import { describe, expect, test } from "bun:test";
import { parseSection, sections, sectionLabels } from "../src/ui/navigation";

describe("local workspace sections", () => {
  test("keeps primary sections and explicit migration/demo destinations", () => {
    expect(sections).toEqual(["home", "assets", "clips", "streamdeck", "connections", "tools", "mock"]);
    expect(sections.map(section => sectionLabels[section])).toEqual(["Home", "Assets", "Clips", "Stream Deck", "Connections", "Tools", "Mock demo"]);
    for (const section of sections) expect(parseSection(section)).toBe(section);
  });
  test("unknown and hostile inputs fall back to Home without executing anything", () => {
    for (const input of [undefined, null, {}, ["assets"], "", "twitch_connect", "/connections", "__proto__", "<script>"])
      expect(parseSection(input)).toBe("home");
  });
});
