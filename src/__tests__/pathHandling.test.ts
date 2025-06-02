import { describe, test, expect } from 'vitest';
import { getAPIPathRoot } from '@/utils/pathHandling';

describe('getAPIPathRoot function', () => {
  test('returns JupyterLab root', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/jupyter/user/someone@janelia.hhmi.org/fg/' },
      writable: true
    });
    expect(getAPIPathRoot()).toBe('/jupyter/user/someone@janelia.hhmi.org/');
  });

  test('returns Jupyter Single User root', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/user/researcher@janelia.hhmi.org/fg/' },
      writable: true
    });
    expect(getAPIPathRoot()).toBe('/user/researcher@janelia.hhmi.org/');
  });

  test('returns / for unknown path', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/something/else' },
      writable: true
    });
    expect(getAPIPathRoot()).toBe('/');
  });
});
