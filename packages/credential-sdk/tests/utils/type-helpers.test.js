import { ensureValidDatetime } from "../../src/utils";

describe("ensureValidDatetime.", () => {
  test("happy path", () => {
    for (const value of [
      "2023-10-09T20:05:44.039Z",
      "2020-01-01T20:12:08.613Z",
      "1970-01-01T20:12:08.613Z",
    ]) {
      expect(ensureValidDatetime(value)).toBe(value);
    }
  });

  test("unhappy path", () => {
    expect(() => ensureValidDatetime("2023-13-09T15:12:08.613Z")).toThrow();
    expect(() => ensureValidDatetime("2020-01-01")).toThrow();
    expect(() => ensureValidDatetime("not a date")).toThrow();
  });
});
