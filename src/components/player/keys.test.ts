import { describe, expect, it } from 'vitest';
import { panelKeyAction } from './keys';

describe('panelKeyAction', () => {
  it('maps the transport keys on the panel itself', () => {
    expect(panelKeyAction(' ', 'panel')).toBe('togglePlay');
    expect(panelKeyAction('ArrowLeft', 'panel')).toBe('prev');
    expect(panelKeyAction('ArrowRight', 'panel')).toBe('next');
    expect(panelKeyAction('ArrowUp', 'panel')).toBe('volumeUp');
    expect(panelKeyAction('ArrowDown', 'panel')).toBe('volumeDown');
    expect(panelKeyAction('a', 'panel')).toBeNull();
  });

  it('still takes the arrow keys while a clicked button has focus', () => {
    expect(panelKeyAction('ArrowUp', 'button')).toBe('volumeUp');
    expect(panelKeyAction('ArrowRight', 'button')).toBe('next');
  });

  it('leaves Space and Enter to the focused button', () => {
    expect(panelKeyAction(' ', 'button')).toBeNull();
    expect(panelKeyAction('Enter', 'button')).toBeNull();
  });
});
