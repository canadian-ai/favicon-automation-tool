import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Canadian AI brand integration", () => {
  it("uses the canonical shared design tokens and semantic theme", () => {
    expect(read("app/globals.css")).toContain("../styles/generated-tokens.css");
    expect(read("app/globals.css")).toContain("../styles/semantic-theme.css");
    expect(read("styles/generated-tokens.css")).toContain("--cai-color-surface-action");
    expect(read("styles/semantic-theme.css")).toContain("--radius: 0rem");
  });

  it("uses the vector mark and correct public domain", () => {
    expect(read("app/page.tsx")).toContain("<CaiLogo");
    expect(read("app/page.tsx")).not.toContain("<Zap");
    expect(read("components/cai-logo.tsx")).toContain('viewBox="0 0 1080 1080"');
    expect(read("app/layout.tsx")).toContain("https://favicon.canadian-ai.app");
    expect(read("app/layout.tsx")).toContain("defaultTheme=\"system\"");
  });
});
