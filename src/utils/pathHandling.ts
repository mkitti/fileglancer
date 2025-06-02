function getAPIPathRoot() {
  const path = window.location.pathname;
  console.log('Current path:', path);
  const patterns = [
    /^\/jupyter\/user\/[^/]+\//, // JupyterLab
    /^\/user\/[^/]+\// // Jupyter Single User
  ];

  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match) {
      console.log('Matched pattern:', match[0]);
      return match[0];
    }
  }
  console.log('No matching pattern found, returning root /');
  return '/';
}

export { getAPIPathRoot };
