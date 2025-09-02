import React from 'react';
import { Typography, Button } from '@material-tailwind/react';
import { HiArrowLeft } from 'react-icons/hi2';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  vscDarkPlus,
  vs
} from 'react-syntax-highlighter/dist/esm/styles/prism';

import Crumbs from './Crumbs';
import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { useCookiesContext } from '@/contexts/CookiesContext';
import { getFileContentPath } from '@/utils';
import type { FileOrFolder } from '@/shared.types';

type FileViewerProps = {
  file: FileOrFolder;
  onBack: () => void;
};

// Map file extensions to syntax highlighter languages
const getLanguageFromExtension = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    md: 'markdown',
    sh: 'bash',
    bash: 'bash',
    zsh: 'zsh',
    fish: 'fish',
    ps1: 'powershell',
    sql: 'sql',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    r: 'r',
    matlab: 'matlab',
    m: 'matlab',
    tex: 'latex',
    dockerfile: 'docker',
    makefile: 'makefile',
    gitignore: 'gitignore',
    toml: 'toml',
    ini: 'ini',
    cfg: 'ini',
    conf: 'ini',
    properties: 'properties'
  };

  return languageMap[extension] || 'text';
};

// Check if file is likely to be a text file that can be syntax highlighted
const isTextFile = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  // Common text file extensions
  const textExtensions = [
    'txt',
    'md',
    'json',
    'xml',
    'html',
    'css',
    'js',
    'jsx',
    'ts',
    'tsx',
    'py',
    'java',
    'c',
    'cpp',
    'h',
    'hpp',
    'cs',
    'php',
    'rb',
    'go',
    'rs',
    'swift',
    'kt',
    'scala',
    'r',
    'sql',
    'sh',
    'bash',
    'zsh',
    'fish',
    'ps1',
    'yml',
    'yaml',
    'toml',
    'ini',
    'cfg',
    'conf',
    'properties',
    'gitignore',
    'dockerfile',
    'makefile',
    'tex',
    'scss',
    'sass',
    'less',
    'vue',
    'svelte',
    'log',
    'csv',
    'tsv'
  ];

  // Also check for files without extensions that are commonly text
  const textFilenames = [
    'readme',
    'license',
    'dockerfile',
    'makefile',
    'changelog',
    'authors',
    'contributing',
    'install',
    'news',
    'todo',
    'version'
  ];

  return (
    textExtensions.includes(extension) ||
    textFilenames.includes(filename.toLowerCase()) ||
    filename.toLowerCase().startsWith('.')
  );
};

export default function FileViewer({
  file,
  onBack
}: FileViewerProps): React.ReactNode {
  const { fileBrowserState } = useFileBrowserContext();
  const { cookies } = useCookiesContext();

  const [content, setContent] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(false);

  // Detect dark mode from document
  React.useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const fetchFileContent = async () => {
      if (!fileBrowserState.currentFileSharePath) {
        setError('No file share path selected');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const url = getFileContentPath(
          fileBrowserState.currentFileSharePath.name,
          file.path
        );

        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'X-XSRFToken': cookies._xsrf
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        // Try to decode as text
        const text = await response.text();
        setContent(text);
      } catch (err) {
        console.error('Error fetching file content:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch file content'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFileContent();
  }, [file.path, fileBrowserState.currentFileSharePath, cookies._xsrf]);

  const renderViewer = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Typography className="text-primary-default">
            Loading file content...
          </Typography>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <Typography className="text-red-500">Error: {error}</Typography>
        </div>
      );
    }

    if (isTextFile(file.name)) {
      const language = getLanguageFromExtension(file.name);

      return (
        <div className="h-full overflow-auto">
          <SyntaxHighlighter
            language={language}
            style={isDarkMode ? vscDarkPlus : vs}
            customStyle={{
              margin: 0,
              padding: '1rem',
              backgroundColor: 'transparent',
              fontSize: '14px',
              lineHeight: '1.5'
            }}
            showLineNumbers={true}
            wrapLines={true}
            wrapLongLines={true}
          >
            {content}
          </SyntaxHighlighter>
        </div>
      );
    }

    // For non-text files, show basic content or a message
    return (
      <div className="p-4">
        <Typography className="text-primary-default mb-4">
          File type not supported for preview
        </Typography>
        <Typography variant="small" className="text-gray-600">
          File: {file.name} ({file.size} bytes)
        </Typography>
        {content && (
          <pre className="mt-4 p-4 bg-surface rounded text-sm overflow-auto max-h-96">
            {content.slice(0, 1000)}
            {content.length > 1000 ? '...' : ''}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Header with breadcrumbs and back button */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-surface">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <HiArrowLeft className="icon-default" />
          Back
        </Button>
        <div className="flex-1">
          <Crumbs />
        </div>
      </div>

      {/* File info header */}
      <div className="px-4 py-2 bg-surface-light border-b border-surface">
        <Typography variant="h6" className="text-primary-default">
          {file.name}
        </Typography>
        <Typography variant="small" className="text-gray-600">
          {file.size} bytes • Last modified:{' '}
          {new Date(file.last_modified * 1000).toLocaleString()}
        </Typography>
      </div>

      {/* File content viewer */}
      <div className="flex-1 overflow-hidden bg-background">
        {renderViewer()}
      </div>
    </div>
  );
}
