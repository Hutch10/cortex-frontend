import { describe, it, expect } from "vitest";
import { parsePayloadStructure } from "./StructuralPayloadParser";

describe("StructuralPayloadParser", () => {
  it("identifies string, number, boolean, object, array, and null", () => {
    const payload = JSON.stringify({
      str: "hello",
      num: 42,
      bool: true,
      obj: { key: "value" },
      arr: [1, 2],
      nullval: null,
    });

    const nodes = parsePayloadStructure(payload);
    expect(nodes).toHaveLength(6);
    
    // Nodes are sorted alphabetically by key
    expect(nodes[0].key).toBe("arr");
    expect(nodes[0].valueType).toBe("array");
    
    expect(nodes[1].key).toBe("bool");
    expect(nodes[1].valueType).toBe("boolean");
    expect(nodes[1].displayValue).toBe("true");

    expect(nodes[2].key).toBe("nullval");
    expect(nodes[2].valueType).toBe("null");

    expect(nodes[3].key).toBe("num");
    expect(nodes[3].valueType).toBe("number");
    expect(nodes[3].displayValue).toBe("42");

    expect(nodes[4].key).toBe("obj");
    expect(nodes[4].valueType).toBe("object");

    expect(nodes[5].key).toBe("str");
    expect(nodes[5].valueType).toBe("string");
    expect(nodes[5].displayValue).toBe("hello");
  });

  it("preserves user-authored values exactly except truncation", () => {
    const payload = JSON.stringify({ custom: "My specific symptom description" });
    const nodes = parsePayloadStructure(payload);
    expect(nodes[0].displayValue).toBe("My specific symptom description");
  });

  it("stable object key ordering", () => {
    const payload = JSON.stringify({ z: 1, a: 2, m: 3 });
    const nodes = parsePayloadStructure(payload);
    expect(nodes[0].key).toBe("a");
    expect(nodes[1].key).toBe("m");
    expect(nodes[2].key).toBe("z");
  });

  it("array index keys render structurally", () => {
    const payload = JSON.stringify(["first", "second"]);
    const nodes = parsePayloadStructure(payload);
    expect(nodes[0].key).toBe("[0]");
    expect(nodes[0].displayValue).toBe("first");
    expect(nodes[1].key).toBe("[1]");
    expect(nodes[1].displayValue).toBe("second");
  });

  it("depth cap marks truncation", () => {
    const payload = JSON.stringify({ a: { b: { c: { d: { e: { f: "too deep" } } } } } });
    const nodes = parsePayloadStructure(payload, { maxDepth: 5 });
    
    const a = nodes[0];
    const b = a.children![0];
    const c = b.children![0];
    const d = c.children![0];
    const e = d.children![0];
    
    expect(e.isTruncated).toBe(true);
    expect(e.children).toBeUndefined();
  });

  it("long string cap marks truncation", () => {
    const longString = "A".repeat(200);
    const payload = JSON.stringify({ str: longString });
    const nodes = parsePayloadStructure(payload, { maxStringLength: 10 });
    
    expect(nodes[0].isTruncated).toBe(true);
    expect(nodes[0].displayValue).toBe("AAAAAAAAAA...");
  });

  it("array/object caps mark truncation", () => {
    const payload = JSON.stringify({
      arr: [1, 2, 3],
      obj: { a: 1, b: 2, c: 3 }
    });
    
    const nodes = parsePayloadStructure(payload, { maxArrayItems: 2, maxObjectKeys: 2 });
    
    expect(nodes[0].key).toBe("arr");
    expect(nodes[0].isTruncated).toBe(true);
    expect(nodes[0].children).toHaveLength(2);
    
    expect(nodes[1].key).toBe("obj");
    expect(nodes[1].isTruncated).toBe(true);
    expect(nodes[1].children).toHaveLength(2);
  });

  it("malformed JSON returns neutral unavailable structure without leaking malformed raw text", () => {
    const nodes = parsePayloadStructure("INVALID {JSON");
    expect(nodes).toHaveLength(1);
    expect(nodes[0].key).toBe("root");
    expect(nodes[0].displayValue).toBe("Payload parsing unavailable.");
  });

  it("output nodes contain no forbidden semantic fields", () => {
    const payload = JSON.stringify({ valid: true });
    const nodes = parsePayloadStructure(payload);
    
    const nodeKeys = Object.keys(nodes[0]);
    expect(nodeKeys).not.toContain("status");
    expect(nodeKeys).not.toContain("trend");
    expect(nodeKeys).not.toContain("category");
    expect(nodeKeys).not.toContain("clinicalMeaning");
    expect(nodeKeys).not.toContain("diagnosis");
    expect(nodeKeys).not.toContain("recommendation");
    expect(nodeKeys).not.toContain("risk");
    expect(nodeKeys).not.toContain("severity");
    expect(nodeKeys).not.toContain("wellnessStatus");
    expect(nodeKeys).not.toContain("interpretation");
  });
  
  it("parser source/output does not generate banned terms", () => {
    const sourceCode = `diagnosis recommendation risk trend urgent abnormal healthy unhealthy symptom severity clinicalMeaning`;
    // We simply assert the parser does not magically inject these terms in its output if they are not in the input.
    const payload = JSON.stringify({ valid: true });
    const str = JSON.stringify(parsePayloadStructure(payload));
    
    expect(str).not.toMatch(/diagnosis|recommendation|risk|trend|urgent|abnormal|healthy|unhealthy|symptom|severity|clinicalMeaning/i);
  });
});
