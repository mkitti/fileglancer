import { ReactWidget } from '@jupyterlab/ui-components';

import React, { useState } from 'react';
import { Toggle } from './components/Toggle';
import { FileBrowser } from './components/FileBrowser';

/**
 * React component for a counter.
 *
 * @returns The React component
 */
const CounterComponent = (): JSX.Element => {
  const [counter, setCounter] = useState(0);

  return (
    <div>
      <Toggle />
      <FileBrowser />
      <p>You clicked {counter} times!</p>
      <button
        onClick={(): void => {
          setCounter(counter + 1);
        }}
      >
        Increment
      </button>
    </div>
  );
};

/**
 * A Counter Lumino Widget that wraps a CounterComponent.
 */
export class CounterWidget extends ReactWidget {
  /**
   * Constructs a new CounterWidget.
   */
  constructor() {
    super();
    this.addClass('jp-react-widget');
  }

  render(): JSX.Element {
    return <CounterComponent />;
  }
}
