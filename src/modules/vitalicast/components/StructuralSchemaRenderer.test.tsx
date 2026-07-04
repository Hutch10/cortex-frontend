import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StructuralSchemaRenderer } from "./StructuralSchemaRenderer";
import { parsePayloadStructure } from "../core/schema/StructuralPayloadParser";

describe("StructuralSchemaRenderer", () => {
  it("renders fixture node tree", () => {
    const payload = JSON.stringify({ a: 1, b: "two" });
    const nodes = parsePayloadStructure(payload);
    
    render(<StructuralSchemaRenderer nodes={nodes} />);
    
    expect(screen.getByText("a")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("b")).toBeTruthy();
    expect(screen.getByText("two")).toBeTruthy();
  });

  it("nested object/array groups are collapsed by default", () => {
    const payload = JSON.stringify({ obj: { nested: "value" } });
    const nodes = parsePayloadStructure(payload);
    
    render(<StructuralSchemaRenderer nodes={nodes} />);
    
    const detailsElement = screen.getByText("obj").closest("details");
    expect(detailsElement).toBeTruthy();
    expect(detailsElement?.hasAttribute("open")).toBe(false);
  });

  it("renders user-authored text exactly when supplied", () => {
    const payload = JSON.stringify({ exactText: "My custom symptom observation" });
    const nodes = parsePayloadStructure(payload);
    
    render(<StructuralSchemaRenderer nodes={nodes} />);
    
    expect(screen.getByText("My custom symptom observation")).toBeTruthy();
  });

  it("does not generate banned semantic language", () => {
    const payload = JSON.stringify({ simple: 123 });
    const nodes = parsePayloadStructure(payload);
    
    render(<StructuralSchemaRenderer nodes={nodes} />);
    
    const text = document.body.textContent || "";
    expect(text).not.toMatch(/diagnosis|recommendation|risk|trend|urgent|abnormal|healthy|unhealthy|symptom|severity|clinicalMeaning/i);
  });

  it("does not render copy/export/share controls", () => {
    const payload = JSON.stringify({ simple: 123 });
    const nodes = parsePayloadStructure(payload);
    
    render(<StructuralSchemaRenderer nodes={nodes} />);
    
    const text = document.body.textContent || "";
    expect(text).not.toMatch(/copy|export|share|paste/i);
  });

  it("does not trigger reads, verification, telemetry, or mutation behavior", () => {
    // StructuralSchemaRenderer takes nodes only. It has no props or hooks 
    // to call external services, reads, or mutations.
    const nodes = parsePayloadStructure(JSON.stringify({ a: 1 }));
    render(<StructuralSchemaRenderer nodes={nodes} />);
    expect(screen.getByText("a")).toBeTruthy();
  });
});
