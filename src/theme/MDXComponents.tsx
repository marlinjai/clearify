import React from 'react';
import { Breadcrumbs } from './components/Breadcrumbs.js';
import { Callout } from './components/Callout.js';
import { Tabs, Tab } from './components/Tabs.js';
import { Steps, Step } from './components/Steps.js';
import { Card, CardGroup } from './components/Card.js';
import { CodeGroup } from './components/CodeGroup.js';
import { Mermaid } from './components/Mermaid.js';
import { MermaidStatic } from './components/MermaidStatic.js';
import { OpenAPI } from './components/OpenAPI.js';
import { Accordion, AccordionGroup } from './components/Accordion.js';
import { Badge } from './components/Badge.js';
import { Tooltip } from './components/Tooltip.js';
import { Columns, Column } from './components/Columns.js';
import { Frame } from './components/Frame.js';
import { StatusBadge } from './components/StatusBadge.js';
import { ProjectCard } from './components/ProjectCard.js';
import { ProjectGrid } from './components/ProjectGrid.js';
import { CodeBlock } from './CodeBlock.js';

export const mdxComponents = {
  Breadcrumbs,
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
  Accordion,
  AccordionGroup,
  Badge,
  Tooltip,
  Columns,
  Column,
  Frame,
  StatusBadge,
  ProjectCard,
  ProjectGrid,
  // Override default pre element with CodeBlock
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => <CodeBlock {...props} />,
};
