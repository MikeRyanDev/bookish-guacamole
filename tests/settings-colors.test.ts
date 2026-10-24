import { expect, test } from "vitest";
import {
  parseHex,
  toHex,
  fromHsv,
  toHsv,
  fromCmyk,
  toCmyk,
  accessibleAccent,
} from "../src/client/colors.js";

test("HEX accepts shorthand and alpha but rejects malformed input", () => {
  expect(toHex(parseHex("#f008")!)).toBe("#ff000088");
  expect(parseHex("#bad-input")).toBeNull();
  expect(parseHex("12345")).toBeNull();
});
test("HSV and CMYK preserve representative colors including black", () => {
  for (const hex of ["#000000", "#ffffff", "#cc6633", "#0099ff"]) {
    const rgb = parseHex(hex)!;
    expect(toHex(fromHsv(...toHsv(rgb), 1))).toBe(hex);
    expect(toHex(fromCmyk(...toCmyk(rgb), 1))).toBe(hex);
  }
});
test("transparent and extreme custom colors get opaque readable UI accents", () => {
  expect(accessibleAccent(parseHex("#ffffff00")!, "light")).not.toBe("#ffffff");
  expect(accessibleAccent(parseHex("#000000")!, "dark")).not.toBe("#000000");
});
