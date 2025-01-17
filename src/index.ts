import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the fileglancer-frontend-ext extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'fileglancer-frontend-ext:plugin',
  description: 'React-based frontend extension for the Fileglancer app.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension fileglancer-frontend-ext is activated!');
  }
};

export default plugin;
