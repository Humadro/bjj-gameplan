import { describe, expect, it } from "vitest";
import { getRef, youtubeEmbedUrl } from "./refs";

const base = { reference_url: null, reference_label: null, reference_start_seconds: null };

describe("getRef", () => {
  it("null when there is no valid http(s) url", () => {
    expect(getRef({ ...base })).toBeNull();
    expect(getRef({ ...base, reference_url: "  " })).toBeNull();
    expect(getRef({ ...base, reference_url: "ftp://x" })).toBeNull();
  });
  it("normalises label and positive start seconds", () => {
    expect(
      getRef({
        reference_url: " https://y.com/x ",
        reference_label: "  ",
        reference_start_seconds: 42.9,
      }),
    ).toEqual({ url: "https://y.com/x", label: null, startSeconds: 42 });
  });
  it("drops non-positive start seconds", () => {
    expect(getRef({ ...base, reference_url: "https://y.com", reference_start_seconds: 0 })?.startSeconds).toBeNull();
  });
});

describe("youtubeEmbedUrl", () => {
  it("watch / youtu.be / shorts -> nocookie embed", () => {
    expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=abc12345", null)).toBe(
      "https://www.youtube-nocookie.com/embed/abc12345",
    );
    expect(youtubeEmbedUrl("https://youtu.be/abc12345", 30)).toBe(
      "https://www.youtube-nocookie.com/embed/abc12345?start=30",
    );
    expect(youtubeEmbedUrl("https://youtube.com/shorts/abc12345", null)).toBe(
      "https://www.youtube-nocookie.com/embed/abc12345",
    );
  });
  it("null for non-YouTube or malformed", () => {
    expect(youtubeEmbedUrl("https://vimeo.com/123", null)).toBeNull();
    expect(youtubeEmbedUrl("not a url", null)).toBeNull();
  });
});
