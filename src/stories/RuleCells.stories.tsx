import { Box } from '@mui/material';
import { Meta, StoryObj } from '@storybook/react';
import {
  RuleConditionCell,
  RuleOperationCell,
  RuleSourceCell,
} from '../components/detail/RuleCells';
import { hugeGatewayRule, l4Rule, ruleWithConditions, simpleRule } from './fixtures';

/**
 * The three cells of the AuthorizationPolicy rules table.
 *
 * These replaced a generic spec tree that turned three facts into 250px of
 * chevrons, so the thing worth checking here is density: how much vertical
 * space a rule takes, and whether a fifty-path rule still fits on a screen.
 */
const meta: Meta<typeof RuleOperationCell> = {
  title: 'Istio/Rule cells',
  component: RuleOperationCell,
  decorators: [
    Story => (
      <Box sx={{ maxWidth: 720, p: 2 }}>
        <Story />
      </Box>
    ),
  ],
};
export default meta;

type OperationStory = StoryObj<typeof RuleOperationCell>;
type SourceStory = StoryObj<typeof RuleSourceCell>;
type ConditionStory = StoryObj<typeof RuleConditionCell>;

export const Operation: OperationStory = {
  args: { rule: simpleRule },
};

/** Negated fields are marked and coloured, so a DENY reads differently. */
export const OperationWithNegations: OperationStory = {
  args: { rule: ruleWithConditions },
};

/** The case that broke the layout: fifty paths capped behind "+N more". */
export const OperationWithFiftyPaths: OperationStory = {
  args: { rule: hugeGatewayRule },
};

/** Filtering narrows the entries inside a cell, not just which rules show. */
export const OperationFilteredByPath: OperationStory = {
  args: { rule: hugeGatewayRule, filter: '/backend-service-4' },
};

export const Source: SourceStory = {
  render: args => <RuleSourceCell {...args} />,
  args: { rule: simpleRule },
};

export const SourceWithIpBlocks: SourceStory = {
  render: args => <RuleSourceCell {...args} />,
  args: { rule: ruleWithConditions },
};

/** No `from` block at all: the policy matches any source. */
export const SourceAny: SourceStory = {
  render: args => <RuleSourceCell {...args} />,
  args: { rule: l4Rule.from ? { to: l4Rule.to } : l4Rule },
};

export const Conditions: ConditionStory = {
  render: args => <RuleConditionCell {...args} />,
  args: { rule: ruleWithConditions },
};

export const ConditionsEmpty: ConditionStory = {
  render: args => <RuleConditionCell {...args} />,
  args: { rule: simpleRule },
};
