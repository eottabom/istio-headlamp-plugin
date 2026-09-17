import { Box, Stack } from '@mui/material';
import { Meta, StoryObj } from '@storybook/react';
import { EnumChip, MeshBadge, TargetRefChip } from '../components/common/Badges';
import { MeshState } from '../lib/mesh';

/**
 * The status chips.
 *
 * Worth eyeballing because two of these were wrong on a real cluster: ztunnel
 * and waypoint pods were labelled "Sidecar", and the "Istio infra" chip was
 * rendered in a grey that was almost invisible on the light theme.
 */
const meta: Meta<typeof MeshBadge> = {
  title: 'Istio/Badges',
  component: MeshBadge,
  decorators: [
    Story => (
      <Box sx={{ p: 2 }}>
        <Story />
      </Box>
    ),
  ],
};
export default meta;

const state = (mode: MeshState['mode'], reason: string): MeshState => ({ mode, reason });

/** Every mesh state side by side, which is how the contrast problem showed up. */
export const AllMeshStates: StoryObj<typeof MeshBadge> = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <MeshBadge state={state('ambient', 'namespace labelled istio.io/dataplane-mode=ambient')} />
      <MeshBadge state={state('sidecar', 'pod has an istio-proxy container')} />
      <MeshBadge state={state('infra', 'Istio ztunnel, part of the Istio data plane')} />
      <MeshBadge state={state('out-of-mesh', 'no Istio namespace labels')} />
      <MeshBadge state={state('unknown', 'pod not loaded')} />
    </Stack>
  ),
};

/** Enum chips carry the judgement: STRICT good, DISABLE bad, UNSET neutral. */
export const EnumChips: StoryObj<typeof EnumChip> = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <EnumChip value="STRICT" good={['STRICT']} bad={['DISABLE']} />
      <EnumChip value="PERMISSIVE" good={['STRICT']} bad={['DISABLE']} neutral={['PERMISSIVE']} />
      <EnumChip value="DISABLE" good={['STRICT']} bad={['DISABLE']} />
      <EnumChip value="ISTIO_MUTUAL" good={['ISTIO_MUTUAL']} />
      <EnumChip value="MESH_EXTERNAL" />
      <EnumChip value={undefined} />
    </Stack>
  ),
};

export const TargetRefs: StoryObj<typeof TargetRefChip> = {
  render: () => (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <TargetRefChip refObj={{ kind: 'Service', name: 'reviews' }} fallbackNamespace="shop" />
      <TargetRefChip refObj={{ kind: 'Gateway', name: 'dev-gateway' }} fallbackNamespace="istio-system" />
      <TargetRefChip refObj={{ kind: 'ServiceEntry', name: 'payments-api' }} fallbackNamespace="shop" />
    </Stack>
  ),
};
