import { NameValueTable, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Alert, Box, Chip, Typography } from '@mui/material';
import { ReactNode } from 'react';

export interface Row {
  name: ReactNode;
  value?: ReactNode;
  /** Skip the row when the value is empty. Defaults to true. */
  hideIfEmpty?: boolean;
}

function isEmpty(v: ReactNode): boolean {
  return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

/**
 * A titled block of name/value rows that drops empty rows automatically.
 *
 * Istio specs are mostly optional fields, so a naive table renders a wall of
 * "—". Dropping empties is what makes a typed detail view shorter than the YAML
 * it replaces.
 */
export function SpecSection({
  title,
  rows,
  children,
  emptyMessage,
}: {
  title: ReactNode;
  rows?: Row[];
  children?: ReactNode;
  emptyMessage?: string;
}) {
  const visible = (rows ?? []).filter(r => r.hideIfEmpty === false || !isEmpty(r.value));

  if (visible.length === 0 && !children) {
    if (!emptyMessage) return null;
    return (
      <SectionBox title={title}>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </SectionBox>
    );
  }

  return (
    <SectionBox title={title}>
      {visible.length > 0 && (
        <NameValueTable rows={visible.map(({ name, value }) => ({ name, value }))} />
      )}
      {children}
    </SectionBox>
  );
}

/** A row of chips, the standard way this plugin renders string lists. */
export function ChipList({
  items,
  color,
  emptyText = '—',
}: {
  items?: (string | number)[];
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  emptyText?: string;
}) {
  if (!items || items.length === 0) {
    return (
      <Typography component="span" variant="body2" color="text.disabled">
        {emptyText}
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {items.map((item, i) => (
        <Chip
          key={i}
          size="small"
          label={String(item)}
          color={color}
          variant="outlined"
          sx={{ fontFamily: 'monospace' }}
        />
      ))}
    </Box>
  );
}

/** Inline warning used for the configuration checks this plugin performs. */
export function ConfigWarning({
  severity = 'warning',
  title,
  children,
}: {
  severity?: 'warning' | 'error' | 'info' | 'success';
  title?: string;
  children: ReactNode;
}) {
  return (
    <Alert severity={severity} sx={{ mb: 2 }}>
      {title && <Typography sx={{ fontWeight: 600 }}>{title}</Typography>}
      {children}
    </Alert>
  );
}

/** Key=value label pairs, e.g. a workload selector. */
export function LabelPairs({ labels }: { labels?: Record<string, string> }) {
  const entries = Object.entries(labels ?? {});
  if (entries.length === 0) {
    return (
      <Typography component="span" variant="body2" color="text.disabled">
        —
      </Typography>
    );
  }
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {entries.map(([k, v]) => (
        <Chip
          key={k}
          size="small"
          label={`${k}=${v}`}
          variant="outlined"
          sx={{ fontFamily: 'monospace' }}
        />
      ))}
    </Box>
  );
}
