import { ReactWidget } from '@jupyterlab/ui-components';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { TestComponent } from './components/TestComponent';

function About() {
  return <h2>About Page</h2>;
}

function CatchAll() {
  return <h2>CatchAll Page</h2>;
}
function Test() {
  return <h2>Test Page</h2>;
}
/**
 * React component for a counter.
 *
 * @returns The React component
 */
const AppComponent = (): JSX.Element => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/lab/about" element={<About />} />
        <Route path="/lab/*" element={<TestComponent />}>
          <Route path="test" element={<Test />} />
          <Route path="*" element={<CatchAll />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

/**
 * A Counter Lumino Widget that wraps a CounterComponent.
 */
export class AppWidget extends ReactWidget {
  /**
   * Constructs a new CounterWidget.
   */
  constructor() {
    super();
    this.addClass('jp-react-widget');
  }

  render(): JSX.Element {
    return <AppComponent />;
  }
}
