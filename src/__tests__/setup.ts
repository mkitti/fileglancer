// https://www.robinwieruch.de/vitest-react-testing-library/
// https://mswjs.io/docs/quick-start

import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { server } from './mocks/node';

expect.extend(matchers);

beforeAll(() => server.listen());

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => server.close());
