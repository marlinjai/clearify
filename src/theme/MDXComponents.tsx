import React from 'react';
import { Callout } from './components/Callout.js';
import { Tabs, Tab } from './components/Tabs.js';
import { Steps, Step } from './components/Steps.js';
import { Card, CardGroup } from './components/Card.js';
import { CodeGroup } from './components/CodeGroup.js';
import { Mermaid } from './components/Mermaid.js';
import { MermaidStatic } from './components/MermaidStatic.js';
import { OpenAPI } from './components/OpenAPI.js';
import { CodeBlock } from './CodeBlock.js';

export const mdxComponents = {
  Callout,
  Tabs,
  Tab,
  Steps,
  Step,
  Card,
  CardGroup,
  CodeGroup,
  Mermaid,
  MermaidStatic,
  OpenAPI,
  // Override default pre element with CodeBlock
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => <CodeBlock {...props} />,
};
