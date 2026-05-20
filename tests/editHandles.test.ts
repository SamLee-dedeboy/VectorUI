import { describe, it, expect } from "vitest";
import { createEditRegistry } from "../src/layout/editHandles";
import type { EditHandle } from "../src/layout/editHandles";

/** Build a mutable ref-like container that mirrors React's MutableRefObject. */
function refFor(handle: EditHandle) {
  return { current: handle };
}

describe("createEditRegistry", () => {
  it("starts empty and active", () => {
    const { value } = createEditRegistry();
    expect(value.active).toBe(true);
    expect(value.snapshot?.()).toEqual([]);
  });

  it("registers a handle and snapshot reflects the ref's current value", () => {
    const { value } = createEditRegistry();
    const ref = refFor({
      id: "a",
      point: { x: 1, y: 2 },
      onDrag: () => {},
    });
    const unregister = value.register!("a", ref);

    expect(value.snapshot?.()).toHaveLength(1);
    expect(value.snapshot?.()[0].point).toEqual({ x: 1, y: 2 });

    // Mutate the ref — the snapshot picks up the new point on next read,
    // because entries store refs not values.
    ref.current = { ...ref.current, point: { x: 5, y: 6 } };
    value.ping?.();
    expect(value.snapshot?.()[0].point).toEqual({ x: 5, y: 6 });

    unregister();
    expect(value.snapshot?.()).toEqual([]);
  });

  it("returns a stable snapshot reference between version bumps", () => {
    const { value } = createEditRegistry();
    const ref = refFor({ id: "a", point: { x: 0, y: 0 }, onDrag: () => {} });
    value.register!("a", ref);

    const first = value.snapshot?.();
    const second = value.snapshot?.();
    expect(first).toBe(second);

    value.ping?.();
    const third = value.snapshot?.();
    expect(third).not.toBe(first);
  });

  it("notifies subscribers on register, ping, and unregister", () => {
    const { value } = createEditRegistry();
    let calls = 0;
    const unsubscribe = value.subscribe!(() => {
      calls += 1;
    });

    const ref = refFor({ id: "a", point: { x: 0, y: 0 }, onDrag: () => {} });
    const unregister = value.register!("a", ref);
    expect(calls).toBe(1);

    value.ping?.();
    expect(calls).toBe(2);

    unregister();
    expect(calls).toBe(3);

    unsubscribe();
    value.ping?.();
    expect(calls).toBe(3);
  });

  it("guards a stale unregister against a remount", () => {
    const { value } = createEditRegistry();
    const refA = refFor({ id: "a", point: { x: 0, y: 0 }, onDrag: () => {} });
    const refB = refFor({ id: "a", point: { x: 9, y: 9 }, onDrag: () => {} });

    const unregisterA = value.register!("a", refA);
    value.register!("a", refB); // remount races with old cleanup

    // Late cleanup from the first mount should not nuke the new entry.
    unregisterA();

    expect(value.snapshot?.()).toHaveLength(1);
    expect(value.snapshot?.()[0].point).toEqual({ x: 9, y: 9 });
  });
});
