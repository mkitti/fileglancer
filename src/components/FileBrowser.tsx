import React from 'react';
// access environmental variable JUPYTER_TOKEN from .env file

export const FileBrowser = (): JSX.Element => {
  async function getContents() {
    const url = 'http://localhost:8888/api/contents/?content=1';
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }

      const json = await response.json();
      console.log(json);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error('An unknown error occurred');
      }
    }
  }

  return <button onClick={getContents}>Get Contents</button>;
};
