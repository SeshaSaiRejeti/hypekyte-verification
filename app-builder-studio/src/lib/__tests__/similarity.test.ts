import { describe, expect, it } from "vitest";
import { addressSimilarity } from "../similarity";

describe("addressSimilarity", () => {
  it("ignores commas, abbreviations, state names and PIN spacing", () => {
    expect(addressSimilarity("14 Linking Rd., Bandra (W), Mumbai - 400 050", "14 Linking Road Bandra West, Mumbai, Maharashtra 400050")).toBe(100);
  });
  it("still scores genuinely different addresses low", () => {
    expect(addressSimilarity("21 Anna Salai, Chennai 600002", "Plot 12, HITEC City, Hyderabad 500081")).toBeLessThan(20);
  });
});
