import { visit } from 'unist-util-visit';
import type { Root, Code } from 'mdast';

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

export function remarkMermaidToComponent() {
  return (tree: Root) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || index === undefined) return;

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
