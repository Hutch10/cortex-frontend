export type StructuralValueType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null";

export interface StructuralFieldNode {
  path: string;
  key: string;
  valueType: StructuralValueType;
  displayValue: string;
  children?: StructuralFieldNode[];
  isTruncated: boolean;
}

export interface ParseOptions {
  maxDepth?: number;
  maxStringLength?: number;
  maxArrayItems?: number;
  maxObjectKeys?: number;
}

export function parsePayloadStructure(
  payload: string,
  options?: ParseOptions
): StructuralFieldNode[] {
  const maxDepth = options?.maxDepth ?? 5;
  const maxStringLength = options?.maxStringLength ?? 160;
  const maxArrayItems = options?.maxArrayItems ?? 100;
  const maxObjectKeys = options?.maxObjectKeys ?? 100;

  let parsed: any;
  try {
    parsed = JSON.parse(payload);
  } catch (err) {
    return [
      {
        path: "root",
        key: "root",
        valueType: "string",
        displayValue: "Payload parsing unavailable.",
        isTruncated: false,
      },
    ];
  }

  function walk(value: any, key: string, path: string, currentDepth: number): StructuralFieldNode {
    if (value === null) {
      return { path, key, valueType: "null", displayValue: "null", isTruncated: false };
    }

    if (typeof value === "boolean") {
      return { path, key, valueType: "boolean", displayValue: String(value), isTruncated: false };
    }

    if (typeof value === "number") {
      return { path, key, valueType: "number", displayValue: String(value), isTruncated: false };
    }

    if (typeof value === "string") {
      const isTruncated = value.length > maxStringLength;
      const displayValue = isTruncated ? value.substring(0, maxStringLength) + "..." : value;
      return { path, key, valueType: "string", displayValue, isTruncated };
    }

    if (Array.isArray(value)) {
      if (currentDepth >= maxDepth) {
        return { path, key, valueType: "array", displayValue: "[Array]", isTruncated: true };
      }

      const isTruncated = value.length > maxArrayItems;
      const itemsToProcess = isTruncated ? value.slice(0, maxArrayItems) : value;

      const children = itemsToProcess.map((item: any, index: number) => {
        const childKey = `[${index}]`;
        return walk(item, childKey, `${path}${childKey}`, currentDepth + 1);
      });

      return { path, key, valueType: "array", displayValue: "", children, isTruncated };
    }

    if (typeof value === "object") {
      if (currentDepth >= maxDepth) {
        return { path, key, valueType: "object", displayValue: "{Object}", isTruncated: true };
      }

      // Stable key ordering
      const keys = Object.keys(value).sort();
      const isTruncated = keys.length > maxObjectKeys;
      const keysToProcess = isTruncated ? keys.slice(0, maxObjectKeys) : keys;

      const children = keysToProcess.map((childKey) => {
        return walk(value[childKey], childKey, `${path}.${childKey}`, currentDepth + 1);
      });

      return { path, key, valueType: "object", displayValue: "", children, isTruncated };
    }

    // Fallback for anything else (should not happen in valid JSON)
    return { path, key, valueType: "string", displayValue: "unknown", isTruncated: false };
  }

  // Treat the root element as the starting point.
  // If it's an object or array, we'll return its children directly.
  const rootNode = walk(parsed, "root", "root", 0);

  if (rootNode.children) {
    return rootNode.children;
  }

  return [rootNode];
}
