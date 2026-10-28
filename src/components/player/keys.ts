export type PanelKeyAction = 'togglePlay' | 'prev' | 'next' | 'volumeUp' | 'volumeDown';

const ACTIONS: Record<string, PanelKeyAction> = {
  ' ': 'togglePlay',
  ArrowLeft: 'prev',
  ArrowRight: 'next',
  ArrowUp: 'volumeUp',
  ArrowDown: 'volumeDown',
};

/** What a key does when it reaches the Winamp column. A focused button keeps Space and Enter (they press it);
 * sliders and the playlist stop their own arrow keys before they get here.
 */
export function panelKeyAction(key: string, target: 'panel' | 'button'): PanelKeyAction | null {
  if (target === 'button' && (key === ' ' || key === 'Enter')) return null;
  return ACTIONS[key] ?? null;
}
