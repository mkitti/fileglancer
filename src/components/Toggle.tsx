import React, { useState } from 'react';

type StyleSettings = {
  mainPanel: {
    left: string;
    width: string;
  };
  leftStack: {
    minWidth: string;
    width: string;
    height: string;
  };
  splitHandle: {
    left: string;
    width: string;
    height: string;
  };
};

const resetStyles: StyleSettings = {
  mainPanel: {
    left: '20%',
    width: '100%'
  },
  leftStack: {
    minWidth: '20%',
    width: '20%',
    height: '100%'
  },
  splitHandle: {
    left: '20%',
    width: '1px',
    height: '100%'
  }
};

const expandedStyles: StyleSettings = {
  mainPanel: {
    left: '0px',
    width: '100%'
  },
  leftStack: {
    minWidth: '0px',
    width: '0px',
    height: '0px'
  },
  splitHandle: {
    left: '0px',
    width: '0px',
    height: '0px'
  }
};

export const Toggle = (): JSX.Element => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleFullscreen = () => {
    const mainPanel = document.getElementById('jp-main-dock-panel');
    const leftStack = document.getElementById('jp-left-stack');
    const splitHandle = document.querySelector(
      '.lm-SplitPanel-handle'
    ) as HTMLElement;
    const splitPanelChild = document.querySelector(
      '.lm-SplitPanel-child'
    ) as HTMLElement;
    const mainAreaWidgets = Array.from(
      document.querySelectorAll('.jp-MainAreaWidget')
    );

    if (!isExpanded) {
      // Expand view
      if (mainPanel) {
        Object.assign(mainPanel.style, expandedStyles.mainPanel);
      }
      if (leftStack) {
        Object.assign(leftStack.style, expandedStyles.leftStack);
      }
      if (splitHandle) {
        Object.assign(splitHandle.style, expandedStyles.splitHandle);
      }
      mainAreaWidgets.forEach((widget: Element) => {
        if (widget instanceof HTMLElement) {
          widget.style.width = '100%';
          widget.style.height = '100%';
        }
      });
    } else if (isExpanded) {
      // Reset to original styles
      if (mainPanel) {
        Object.assign(mainPanel.style, resetStyles.mainPanel);
      }
      if (leftStack) {
        Object.assign(leftStack.style, resetStyles.leftStack);
      }
      if (splitHandle) {
        Object.assign(splitHandle.style, resetStyles.splitHandle);
      }
      if (splitPanelChild) {
        splitPanelChild.style.width = '100% !important';
      }
      mainAreaWidgets.forEach((widget: Element) => {
        if (widget instanceof HTMLElement) {
          widget.style.width = '80%';
          widget.style.height = '100%';
        }
      });
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <button onClick={toggleFullscreen}>
      {isExpanded ? 'Reset View' : 'Expand View'}
    </button>
  );
};
