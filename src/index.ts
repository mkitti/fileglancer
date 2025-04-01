import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { MainAreaWidget } from '@jupyterlab/apputils';
import { ILauncher } from '@jupyterlab/launcher';
import { requestAPI } from './handler';
import { AppWidget } from './App';
import { LabIcon } from '@jupyterlab/ui-components';
import iconStr from '../style/img/fileglancer.svg';

/**
 * Custom icon
 */
const FileglancerIcon = new LabIcon({
  name: 'fileglancer',
  svgstr: iconStr
});

/**
 * The command IDs used by the react-widget plugin.
 */
namespace CommandIDs {
  export const createReactWidget = 'create-react-widget';
}

/**
 * Initialization data for the fileglancer extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'fileglancer:plugin',
  description: 'Browse, share, and publish files on the Janelia file system',
  autoStart: true,
  optional: [ILauncher],
  activate: (app: JupyterFrontEnd, launcher: ILauncher) => {
    console.log('JupyterLab extension fileglancer is activated!');

    const { commands } = app;
    const command = CommandIDs.createReactWidget;

    commands.addCommand(command, {
      label: 'Fileglancer',
      icon: FileglancerIcon,
      execute: () => {
        console.log('Create React widget command executed');
        const content = new AppWidget();
        const widget = new MainAreaWidget<AppWidget>({ content });
        widget.title.label = 'Fileglancer';
        widget.title.icon = FileglancerIcon;
        app.shell.add(widget, 'main');
      }
    });

    if (launcher) {
      console.log('Adding command to launcher');
      launcher.add({ command });
    }

    if (navigator.webdriver) {
      console.log('Running in test mode, skipping demos.');
      return;
    }

    const preferenceValue = {
      "value": [0,1,2]
    }

    const requestInit: RequestInit = {
      method: 'PUT',
      body: JSON.stringify(preferenceValue),
      headers: {
        'Content-Type': 'application/json'
      }
    };

    requestAPI<any>('preference?key=my_preference', requestInit)
      .then(data => {
        console.log('Set preference my_preference');
      })
      .catch(reason => {
        console.error(`Problem calling set preference API:\n${reason}`);
      });

    requestAPI<any>('preference?key=my_preference')
      .then(data => {
        console.log('Retrieved preference my_preference:');
        console.log(data);
      })
      .catch(reason => {
        console.error(`Problem calling get preference API:\n${reason}`);
      });

    // The following demo is commented out because it creates a new ticket 
    // every time the browser is reloaded.
    /* 
    const ticketValue = {
      "project_key": "FT",
      "issue_type": "Service Request",
      "summary": "Test ticket",
      "description": "This is a test ticket"
    }

    const ticketRequestInit: RequestInit = {
      method: 'POST',
      body: JSON.stringify(ticketValue),
      headers: {
        'Content-Type': 'application/json'
      }
    };

    requestAPI<any>('ticket', ticketRequestInit)
      .then(data => {
        const ticketKey = data;
        console.log('Created ticket '+ticketKey);

        requestAPI<any>('ticket?ticket_key='+ticketKey)
        .then(data => {
          console.log('Retrieved ticket:');
          console.log(data);

          const deleteTicketRequestInit: RequestInit = {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            }
          };

          requestAPI<any>('ticket?ticket_key='+ticketKey, deleteTicketRequestInit)
            .then(data => {
              console.log('Deleted ticket: '+ticketKey);
            });
            
        }); 
      });
    */

  }
};

export default plugin;
