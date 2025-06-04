import { describe, test, expect } from 'vitest';
import {
  joinPaths,
  getFileFetchPath,
  getLastSegmentFromPath,
  makePathSegmentArray,
  removeLastSegmentFromPath,
  convertPathToWindowsStyle
} from '@/utils';

describe('joinPaths', () => {
  test('joins paths in POSIX style', () => {
    expect(joinPaths('a', 'b', 'c')).toBe('a/b/c');
  });
  test('trims whitespace from segments', () => {
    expect(joinPaths('a ', ' b', 'c ')).toBe('a/b/c');
  });
});

describe('getFileFetchPath', () => {
  test('returns correct API path for normal path', () => {
    expect(getFileFetchPath('fsp_name', 'file.zarr')).toBe(
      '/api/fileglancer/files/fsp_name?subpath=file.zarr'
    );
  });
  test('handles empty string', () => {
    expect(getFileFetchPath('')).toBe('/api/fileglancer/files/');
  });
  test('handles parentOnly param', () => {
    expect(getFileFetchPath('fsp', 'file', true)).toBe(
      '/api/fileglancer/files/fsp?subpath=file&parent_only=true'
    );
  });
  test('encodes filePath', () => {
    expect(getFileFetchPath('fsp', 'a/b c')).toBe(
      '/api/fileglancer/files/fsp?subpath=a%2Fb%20c'
    );
  });
});

describe('getLastSegmentFromPath', () => {
  test('returns last segment of POSIX-style path', () => {
    expect(getLastSegmentFromPath('/a/b/c.txt')).toBe('c.txt');
  });
});

describe('makePathSegmentArray', () => {
  test('splits POSIX-style path into segments', () => {
    expect(makePathSegmentArray('/a/b/c')).toEqual(['', 'a', 'b', 'c']);
  });
});

describe('removeLastSegmentFromPath', () => {
  test('removes last segment from POSIX-style path', () => {
    expect(removeLastSegmentFromPath('/a/b/c.txt')).toBe('/a/b');
  });
});

describe('convertPathToWindowsStyle', () => {
  test('converts POSIX path to Windows path', () => {
    expect(convertPathToWindowsStyle('/a/b/c')).toBe('\\a\\b\\c');
  });
  test('handles already Windows-style path', () => {
    expect(convertPathToWindowsStyle('a\\b\\c')).toBe('a\\b\\c');
  });
  test('handles mixed slashes', () => {
    expect(convertPathToWindowsStyle('/a/b\\c/d')).toBe('\\a\\b\\c\\d');
  });
});
