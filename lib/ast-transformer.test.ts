import { describe, expect, it } from "vitest";
import {
  getTransformer,
  transformDocumentHead,
  transformLayoutMetadata,
  validateTransformation,
} from "./ast-transformer";

const FAVICON = "/icon.svg";

function countMatches(code: string, pattern: RegExp): number {
  return code.match(pattern)?.length ?? 0;
}

const iconsKey = /["']?\bicons["']?\s*:/g;

describe("transformLayoutMetadata", () => {
  it("adds icons when metadata has none", () => {
    const input = `export const metadata = {\n  title: "a",\n};`;
    const result = transformLayoutMetadata(input, FAVICON);

    expect(result.changed).toBe(true);
    expect(countMatches(result.code, iconsKey)).toBe(1);
    expect(result.code).toContain(`icon: "${FAVICON}"`);
    expect(result.code).toContain(`title: "a"`);
    expect(validateTransformation(result.code)).toBe(true);
  });

  it("overrides an existing icons object instead of appending a duplicate", () => {
    const input = `import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "App",
  icons: { icon: "/favicon.ico", apple: "/apple.png" },
  description: "x",
};`;
    const result = transformLayoutMetadata(input, FAVICON);

    expect(result.changed).toBe(true);
    expect(countMatches(result.code, iconsKey)).toBe(1);
    expect(result.code).toContain(`icon: "${FAVICON}"`);
    expect(result.code).not.toContain("/favicon.ico");
    expect(result.code).not.toContain("/apple.png");
    expect(validateTransformation(result.code)).toBe(true);
  });

  it("repairs the broken state where icons was already duplicated", () => {
    const input = `import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Ore",
  icons: { icon: "/favicon.ico", apple: "/apple.png" },
  description: "x",
  icons: {
    icon: "/icon.svg"
  }
};`;
    const result = transformLayoutMetadata(input, FAVICON);

    expect(result.changed).toBe(true);
    expect(countMatches(result.code, iconsKey)).toBe(1);
    expect(result.code).not.toContain("/favicon.ico");
    expect(result.code).toContain(`title: "Ore"`);
    expect(result.code).toContain(`description: "x"`);
    expect(validateTransformation(result.code)).toBe(true);
  });

  it("overrides an icons array", () => {
    const input = `export const metadata = { title: "a", icons: [{ url: "/a.png" }] };`;
    const result = transformLayoutMetadata(input, FAVICON);

    expect(result.changed).toBe(true);
    expect(countMatches(result.code, iconsKey)).toBe(1);
    expect(result.code).not.toContain("/a.png");
    expect(result.code).toContain(`icon: "${FAVICON}"`);
  });

  it("overrides a quoted icons key inside a satisfies expression", () => {
    const input = `export const metadata = { "icons": "/old.ico" } satisfies Metadata;`;
    const result = transformLayoutMetadata(input, FAVICON);

    expect(result.changed).toBe(true);
    expect(countMatches(result.code, iconsKey)).toBe(1);
    expect(result.code).not.toContain("/old.ico");
    expect(result.code).toContain("satisfies Metadata");
  });

  it("is idempotent when running twice", () => {
    const input = `export const metadata = { title: "a" };`;
    const first = transformLayoutMetadata(input, FAVICON);
    const second = transformLayoutMetadata(first.code, FAVICON);

    expect(countMatches(second.code, iconsKey)).toBe(1);
    expect(validateTransformation(second.code)).toBe(true);
  });

  it("switches to a new favicon on a subsequent request", () => {
    const first = transformLayoutMetadata(`export const metadata = { title: "a" };`, FAVICON);
    const second = transformLayoutMetadata(first.code, "/favicon.png");

    expect(second.changed).toBe(true);
    expect(countMatches(second.code, iconsKey)).toBe(1);
    expect(second.code).toContain(`icon: "/favicon.png"`);
    expect(second.code).not.toContain(FAVICON);
  });
});

describe("transformDocumentHead", () => {
  it("replaces existing icon links with a single new one", () => {
    const input = `import { Html, Head } from "next/document";
export default function D() {
  return (
    <Html>
      <Head>
        <link rel="icon" href="/old.ico" />
        <link rel="shortcut icon" href="/old2.ico" />
      </Head>
    </Html>
  );
}`;
    const result = transformDocumentHead(input, FAVICON);

    expect(result.changed).toBe(true);
    expect(countMatches(result.code, /rel="(shortcut )?icon"/g)).toBe(1);
    expect(result.code).toContain(`href="${FAVICON}"`);
    expect(result.code).not.toContain("/old.ico");
    expect(result.code).not.toContain("/old2.ico");
    expect(validateTransformation(result.code)).toBe(true);
  });

  it("keeps non-icon links intact", () => {
    const input = `import { Html, Head } from "next/document";
export default function D() {
  return (
    <Html>
      <Head>
        <link rel="stylesheet" href="/styles.css" />
        <link rel="icon" href="/old.ico" />
      </Head>
    </Html>
  );
}`;
    const result = transformDocumentHead(input, FAVICON);

    expect(result.code).toContain(`href="/styles.css"`);
    expect(result.code).not.toContain("/old.ico");
    expect(countMatches(result.code, /rel="icon"/g)).toBe(1);
  });
});

describe("getTransformer", () => {
  it("maps project types to the right transformer", () => {
    expect(getTransformer("app-router")?.fileType).toBe("layout");
    expect(getTransformer("hybrid")?.fileType).toBe("layout");
    expect(getTransformer("pages-router")?.fileType).toBe("document");
    expect(getTransformer("unknown")).toBeNull();
  });
});
