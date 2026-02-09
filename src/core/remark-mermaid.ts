import { visit } from 'unist-util-visit';
import type { Root, Code } from 'mdast';
import { mermaidContentHash } from './mermaid-utils.js';

interface MdxJsxAttribute {
  type: 'mdxJsxAttribute';
  name: string;
  value: string;
}

interface MdxJsxFlowElement {
  type: 'mdxJsxFlowElement';
  name: string;
  attributes: MdxJsxAttribute[];
  children: { type: 'text'; value: string }[];
}

let preRenderedSvgs: Map<string, { lightSvg: string; darkSvg: string }> | null = null;

export function setPreRenderedMermaidSvgs(svgs: Map<string, { lightSvg: string; darkSvg: string }>) {
  preRenderedSvgs = svgs;
}

export function clearPreRenderedMermaidSvgs() {
  preRenderedSvgs = null;
}

export function remarkMermaidToComponent() {
  return (tree: Root) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || index === undefined) return;

      if (preRenderedSvgs) {
        const hash = mermaidContentHash(node.value);
        if (preRenderedSvgs.has(hash)) {
          const element: MdxJsxFlowElement = {
            type: 'mdxJsxFlowElement',
            name: 'MermaidStatic',
            attributes: [
              { type: 'mdxJsxAttribute', name: 'diagramHash', value: hash },
            ],
            children: [],
          };
          parent.children[index] = element as any;
          return;
        }
      }

      // Fallback: client-side Mermaid rendering
      const element: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: 'Mermaid',
        attributes: [],
        children: [{ type: 'text', value: node.value }],
      };

      parent.children[index] = element as any;
    });
  };
}
