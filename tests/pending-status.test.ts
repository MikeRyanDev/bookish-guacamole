// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { PendingStatus } from "../web/src/components/pending-status.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("fast restoration never paints progress text; slower restoration gets feedback", () => {
  vi.useFakeTimers();
  const view = render(createElement(PendingStatus, { children: "Restoring session…" }));
  expect(screen.queryByRole("status")).toBeNull();
  act(() => vi.advanceTimersByTime(249));
  expect(screen.queryByRole("status")).toBeNull();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole("status").textContent).toBe("Restoring session…");
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});

test("finishing before the delay cancels progress feedback", () => {
  vi.useFakeTimers();
  const view = render(createElement(PendingStatus, { children: "Connecting…" }));
  act(() => vi.advanceTimersByTime(100));
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
  act(() => vi.advanceTimersByTime(500));
  expect(screen.queryByRole("status")).toBeNull();
});
