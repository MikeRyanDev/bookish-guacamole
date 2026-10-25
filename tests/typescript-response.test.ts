import { expect, test } from "vitest";
import { parseTypeScriptResponse } from "../src/client/components/typescript-response.js";

test("native return values retain precision, escapes, and false/zero/null/empty distinctions", () => {
  for (const json of [
    "false",
    "0",
    "null",
    '""',
    "[]",
    "{}",
    "9007199254740993",
    '{"line":"a\\nb","list":[false,null,0]}',
  ]) {
    expect(parseTypeScriptResponse(`{"success":true,"result":${json}}`)?.resultJson).toBe(json);
  }
  expect(parseTypeScriptResponse('{"success":true}')?.resultJson).toBeUndefined();
  expect(parseTypeScriptResponse('{"success":true,"result":0,"result":false}')?.resultJson).toBe(
    "false",
  );
});

test("failure evidence keeps logs, partial return, and diagnostic fields without inferring missing data", () => {
  expect(
    parseTypeScriptResponse(
      JSON.stringify({
        success: false,
        result: 0,
        logs: ["Started", "ERROR: failed"],
        error: { message: "Timeout", name: "TimeoutError", line: 4, stack: "call()" },
      }),
    ),
  ).toEqual({
    success: false,
    resultJson: "0",
    logs: ["Started", "ERROR: failed"],
    error: { message: "Timeout", name: "TimeoutError", line: 4, stack: "call()" },
  });
  expect(parseTypeScriptResponse('{"success":false}')).toEqual({
    success: false,
    resultJson: undefined,
    logs: [],
    error: undefined,
  });
});

test("unknown and malformed envelopes remain raw evidence instead of misleading native views", () => {
  for (const output of [
    "",
    "{broken",
    "null",
    "42",
    "[]",
    "{}",
    '{"success":"true"}',
    '{"success":true,"logs":[1]}',
    '{"success":false,"error":"oops"}',
    '{"success":false,"error":{"message":3}}',
  ]) {
    expect(parseTypeScriptResponse(output)).toBeUndefined();
  }
  expect(
    parseTypeScriptResponse('{"success":true,"result":1,"future":{"anything":true}}')?.resultJson,
  ).toBe("1");
});
