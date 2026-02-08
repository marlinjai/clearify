import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { App } from './App.js';

const container = document.getElementById('root')!;

if (container.dataset.clearifySsr) {
  hydrateRoot(container, <App />);
} else {
  createRoot(container).render(<App />);
}
