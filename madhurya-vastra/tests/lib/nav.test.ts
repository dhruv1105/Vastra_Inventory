import { describe, expect, it } from "vitest";
import { activeNav, pageTitle } from "@/components/layout/nav";

describe("activeNav", () => {
  it("an item's page belongs to Inventory", () => {
    expect(activeNav("/items/d5eed000-0000-4000-8000-000000000001")?.href).toBe("/inventory");
    expect(pageTitle("/items/d5eed000-0000-4000-8000-000000000001")).toBe("Inventory");
  });
  it("Add Item stays Add Item", () => {
    expect(activeNav("/items/new")?.href).toBe("/items/new");
    expect(activeNav("/items/new/")?.href).toBe("/items/new");
  });
  it("an id that merely starts with 'new' is still an item page", () => {
    expect(activeNav("/items/newer-id")?.href).toBe("/inventory");
  });
  it("other screens are unchanged", () => {
    expect(activeNav("/inventory")?.href).toBe("/inventory");
    expect(activeNav("/manage-lists")?.href).toBe("/manage-lists");
    expect(activeNav("/staff")).toBeUndefined();
  });
});
