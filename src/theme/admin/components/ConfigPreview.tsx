import React from 'react';

interface ConfigPreviewProps {
  before: object;
  after: object;
  onConfirm: () => void;
  onCancel: () => void;
}

type DiffLineType = 'unchanged' | 'added' | 'removed';

interface DiffLine {
  text: string;
  type: DiffLineType;
}

/**
 * Basic line-by-line diff of two JSON objects.
 * Uses longest-common-subsequence to produce a minimal diff.
 */
function computeDiff(before: object, after: object): DiffLine[] {
  const beforeLines = JSON.stringify(before, null, 2).split('\n');
  const afterLines = JSON.stringify(after, null, 2).split('\n');

  // Build LCS table
  const m = beforeLines.length;
  const n = afterLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (beforeLines[i - 1] === afterLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
      result.push({ text: beforeLines[i - 1], type: 'unchanged' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ text: afterLines[j - 1], type: 'added' });
      j--;
    } else {
      result.push({ text: beforeLines[i - 1], type: 'removed' });
      i--;
    }
  }

  return result.reverse();
}

const lineColors: Record<DiffLineType, { bg: string; color: string; prefix: string }> = {
  unchanged: { bg: 'transparent', color: 'var(--clearify-text-secondary)', prefix: '  ' },
  added:     { bg: 'rgba(34, 197, 94, 0.12)', color: 'var(--clearify-text)', prefix: '+ ' },
  removed:   { bg: 'rgba(239, 68, 68, 0.12)', color: 'var(--clearify-text)', prefix: '- ' },
};

const buttonBase: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: 'var(--clearify-radius-sm)',
  fontSize: '0.8125rem',
  fontWeight: 600,
  cursor: 'pointer',
  border: '1px solid var(--clearify-border)',
  transition: 'background-color 0.15s, color 0.15s',
};

export function ConfigPreview({ before, after, onConfirm, onCancel }: ConfigPreviewProps) {
  const lines = computeDiff(before, after);
  const hasChanges = lines.some((l) => l.type !== 'unchanged');

  return (
    <div>
      <p
        style={{
          fontSize: '0.8125rem',
          color: 'var(--clearify-text-secondary)',
          marginBottom: '0.75rem',
        }}
      >
        {hasChanges
          ? 'Review the configuration changes below before saving.'
          : 'No changes detected.'}
      </p>

      <div
        style={{
          maxHeight: '50vh',
          overflow: 'auto',
          borderRadius: 'var(--clearify-radius-sm)',
          border: '1px solid var(--clearify-border)',
          backgroundColor: 'var(--clearify-bg)',
          marginBottom: '1rem',
        }}
      >
        <pre
          style={{
            margin: 0,
            padding: '0.75rem',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.8125rem',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {lines.map((line, i) => {
            const { bg, color, prefix } = lineColors[line.type];
            return (
              <div
                key={i}
                style={{
                  backgroundColor: bg,
                  color,
                  padding: '0 0.25rem',
                  marginLeft: '-0.25rem',
                  marginRight: '-0.25rem',
                  borderRadius: 2,
                }}
              >
                <span style={{ opacity: 0.5, userSelect: 'none' }}>{prefix}</span>
                {line.text}
              </div>
            );
          })}
        </pre>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button
          onClick={onCancel}
          style={{
            ...buttonBase,
            backgroundColor: 'var(--clearify-bg-secondary)',
            color: 'var(--clearify-text)',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!hasChanges}
          style={{
            ...buttonBase,
            backgroundColor: hasChanges ? 'var(--clearify-primary)' : 'var(--clearify-text-tertiary)',
            color: '#fff',
            border: 'none',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
          }}
        >
          Confirm &amp; Save
        </button>
      </div>
    </div>
  );
}
