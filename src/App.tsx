import { ReactWidget } from '@jupyterlab/ui-components';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { MainLayout } from './layouts/MainLayout';
import Home from './components/Home';
import Files from './components/Files';
import Help from './components/Help';
import Jobs from './components/Jobs';

function About() {
  return <h2>About Page</h2>;
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
        <Route path="/lab/*" element={<MainLayout />}>
          <Route path="files" element={<Files />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="help" element={<Help />} />
          <Route path="*" element={<Home />} />
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
