import { Icon } from '@iconify/react';
import { Box, Button, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import yaml from 'js-yaml';
import { useMemo, useState } from 'react';
import { SpecTree } from './SpecTree';

/**
 * The whole of a resource's `spec` (or `status`), in two views.
 *
 * The tree leads: it is the reason to be on this page rather than in the YAML
 * editor -- readable field names, long lists folded, flat object lists drawn
 * as tables. YAML is one click away for the things it is better at: seeing the
 * document as it was written, and copying it back into `kubectl apply`.
 *
 * Whichever view someone picks is remembered, so nobody has to keep switching.
 */
export function FullSpec({ value, storageKey }: { value: unknown; storageKey?: string }) {
  const [view, setView] = useState<'yaml' | 'tree'>(() => readPreference(storageKey));
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => toYaml(value), [value]);

  const choose = (next: 'yaml' | 'tree') => {
    setView(next);
    writePreference(storageKey, next);
  };

  const copy = () => {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => undefined
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
          mb: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: '12rem' }}>
          Every field, including anything the sections above do not cover.
        </Typography>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, next) => next && choose(next)}
        >
          <ToggleButton value="tree" sx={{ textTransform: 'none', px: 1.5 }}>
            Tree
          </ToggleButton>
          <ToggleButton value="yaml" sx={{ textTransform: 'none', px: 1.5 }}>
            YAML
          </ToggleButton>
        </ToggleButtonGroup>

        {view === 'yaml' && (
          <Tooltip title={copied ? 'Copied' : 'Copy YAML'}>
            <Button
              size="small"
              onClick={copy}
              startIcon={<Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} width={16} />}
              sx={{ textTransform: 'none' }}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </Tooltip>
        )}
      </Box>

      {view === 'yaml' ? (
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1.5,
            maxHeight: '32rem',
            overflow: 'auto',
            fontSize: '0.8rem',
            lineHeight: 1.6,
            bgcolor: 'action.hover',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
          }}
        >
          {text}
        </Box>
      ) : (
        <SpecTree value={value} />
      )}
    </Box>
  );
}

/** `yaml.dump` throws on the odd unserialisable value; the view must not. */
function toYaml(value: unknown): string {
  if (value === null || value === undefined) return '';
  try {
    return yaml.dump(value, { indent: 2, lineWidth: 100, noRefs: true, sortKeys: false }).trimEnd();
  } catch {
    return JSON.stringify(value, null, 2);
  }
}

// Whichever view someone picks is the one they want on the next resource too,
// so it is remembered. Storage is unavailable in some embeddings, and a failed
// read must not take the page down with it.
function readPreference(storageKey?: string): 'yaml' | 'tree' {
  if (!storageKey) return 'tree';
  try {
    return localStorage.getItem(storageKey) === 'yaml' ? 'yaml' : 'tree';
  } catch {
    return 'tree';
  }
}

function writePreference(storageKey: string | undefined, view: 'yaml' | 'tree') {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, view);
  } catch {
    /* not worth surfacing */
  }
}
