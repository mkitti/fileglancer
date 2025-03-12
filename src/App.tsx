import { ReactWidget } from '@jupyterlab/ui-components';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { MainLayout } from './layouts/MainLayout';
import Home from './components/Home';
import Files from './components/Files';
import Help from './components/Help';
import Jobs from './components/Jobs';

function Profile() {
  return <h2>Profile Page</h2>;
}

function Login() {
  return <h2>Login Page</h2>;
}

function Preferences() {
  return <h2>Preferences Page</h2>;
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
        <Route path="/lab/login" element={<Login />} />
        <Route path="/lab/*" element={<MainLayout />}>
          <Route path="files" element={<Files />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="help" element={<Help />} />
          <Route path="profile" element={<Profile />} />
          <Route path="preferences" element={<Preferences />} />
          <Route path="*" element={<Home />} />
        </Route>
        <Route path="/jupyter/user/:username/lab/*" element={<MainLayout />}>
          <Route path="files" element={<Files />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="help" element={<Help />} />
          <Route path="profile" element={<Profile />} />
          <Route path="preferences" element={<Preferences />} />
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
