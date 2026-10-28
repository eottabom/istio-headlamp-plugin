/** Accept the Istio API group and its subdomains, but not lookalike domains. */
export function isIstioCrdGroup(group: string): boolean {
  return group === 'istio.io' || group.endsWith('.istio.io');
}
