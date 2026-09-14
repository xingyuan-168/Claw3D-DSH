/**
 * Loader for the single machine-readable rule source: governance/policy.yaml
 * (V4 spec section 47). Python core and this plugin both parse ONE file;
 * neither side keeps a parallel rule copy.
 *
 * The parser implements the small YAML subset the policy file uses: nested
 * maps, block lists, inline string lists, quoted/plain scalars, comments.
 * Deliberately not a general YAML engine.
 */

import { readFileSync } from "node:fs";

/** @param {string} line - comment-stripped, non-empty line. */
function scalarOf(text) {
  const t = text.trim();
  if (t === '""' || t === "''") return "";
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return t;
}

function inlineList(text) {
  const inner = text.trim().replace(/^\[/, "").replace(/\]$/, "").trim();
  if (!inner) return [];
  return inner.split(",").map((item) => scalarOf(item));
}

/**
 * Parse the policy YAML subset into a plain object tree. A key with an
 * empty value looks ahead: the next deeper line decides between a block
 * list ("- item") and a nested map ("key: value").
 * @param {string} text
 */
export function parsePolicyYaml(text) {
  const lines = text
    .split(/\r?\n/)
    .map((raw) => {
      const noComment = raw.replace(/(^|\s)#.*$/, "");
      if (!noComment.trim()) return null;
      return {
        indent: noComment.length - noComment.trimStart().length,
        content: noComment.trim(),
      };
    })
    .filter(Boolean);

  /** Next line with a strictly deeper indent, or null. */
  const deeperOf = (index) => {
    const current = lines[index];
    for (let i = index + 1; i < lines.length; i += 1) {
      if (lines[i].indent > current.indent) return lines[i];
      if (lines[i].indent <= current.indent) return null;
    }
    return null;
  };

  const root = {};
  /** @type {{indent: number, container: object|any[]}[]} */
  const stack = [{ indent: -1, container: root }];

  for (let index = 0; index < lines.length; index += 1) {
    const { indent, content } = lines[index];
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].container;

    const itemMatch = content.match(/^-(?:\s+(.*))?$/);
    if (itemMatch) {
      if (!Array.isArray(parent)) continue;
      const rest = (itemMatch[1] || "").trim();
      if (rest.startsWith("[")) parent.push(inlineList(rest));
      else if (rest) parent.push(scalarOf(rest));
      // Bare "-" items are not used by the policy file.
      continue;
    }

    const keyMatch = content.match(/^([^:]+):\s*(.*)$/);
    if (!keyMatch) continue;
    const key = keyMatch[1].trim();
    const rest = keyMatch[2].trim();
    if (rest.startsWith("[")) {
      parent[key] = inlineList(rest);
    } else if (rest !== "") {
      parent[key] = scalarOf(rest);
    } else {
      const deeper = deeperOf(index);
      if (deeper && /^-/.test(deeper.content)) {
        parent[key] = [];
        stack.push({ indent, container: parent[key] });
      } else {
        parent[key] = {};
        stack.push({ indent, container: parent[key] });
      }
    }
  }
  return root;
}

/** @param {string} path - absolute or relative file path. */
export function loadPolicy(path) {
  return parsePolicyYaml(readFileSync(path, "utf8"));
}