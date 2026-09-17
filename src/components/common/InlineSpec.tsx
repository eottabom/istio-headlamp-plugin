import { Box, Typography } from '@mui/material';
import { humanizeKey } from './SpecTree';

/**
 * A flattened, one-line-per-leaf rendering of a spec fragment.
 *
 * `SpecTree` is built for a full-width section: chevrons, guide lines and one
 * row per key. Inside a table cell that chrome outweighs the content -- a
 * custom tag `{env: {literal: {value: dev}}}` became three indented rows with
 * two collapse toggles. This renders the same thing as `env.literal.value  dev`,
 * which fits a cell and stays scannable.
 */

export interface InlineSpecProps {
  value: unknown;
  /** Stop flattening beyond this depth and print the remainder as JSON. */
  maxDepth?: number;
}

interface Leaf {
  path: string;
  value: string;
}

export function InlineSpec({ value, maxDepth = 4 }: InlineSpecProps) {
  const leaves = flatten(value, '', maxDepth);

  if (leaves.length === 0) {
    return (
      <Typography component="span" variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 1.5, rowGap: 0.25, minWidth: 0 }}>
      {leaves.map(leaf => (
        <Box key={leaf.path} sx={{ display: 'contents' }}>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {leaf.path}
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere', lineHeight: 1.4 }}
          >
            {leaf.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function flatten(value: unknown, prefix: string, depth: number): Leaf[] {
  if (value === null || value === undefined) return [];

  if (Array.isArray(value)) {
    // A list of plain values reads better joined than split across rows.
    if (value.every(v => v === null || typeof v !== 'object')) {
      return [{ path: prefix || 'items', value: value.join(', ') }];
    }
    return value.flatMap((v, i) => flatten(v, prefix ? `${prefix}[${i}]` : `[${i}]`, depth - 1));
  }

  if (typeof value === 'object') {
    if (depth <= 0) return [{ path: prefix || '…', value: JSON.stringify(value) }];
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${humanizeKeyPath(k)}` : humanizeKeyPath(k), depth - 1));
  }

  return [{ path: prefix || 'value', value: String(value) }];
}

/** Keep data keys verbatim; tidy schema field names only. */
function humanizeKeyPath(key: string): string {
  const label = humanizeKey(key);
  return label === key ? key : label.toLowerCase().replace(/ /g, '');
}
