import { useEffect, useState } from 'react';
import { Switch, Typography } from '@material-tailwind/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import {
  materialDark,
  coy
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import { HiOutlineDownload } from 'react-icons/hi';

import { useFileBrowserContext } from '@/contexts/FileBrowserContext';
import { formatFileSize, formatUnixTimestamp, getFileURL } from '@/utils';
import type { FileOrFolder } from '@/shared.types';
import {
  useFileContentQuery,
  useFileMetadataQuery,
  useFileBinaryPreviewQuery,
  isKnownBinaryExtension
} from '@/queries/fileContentQueries';
import HexDump from './HexDump';

type FileViewerProps = {
  readonly file: FileOrFolder;
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
    zattrs: 'json',
    zarray: 'json',
    zgroup: 'json',
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
    jl: 'julia',
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

export default function FileViewer({ file }: FileViewerProps) {
  const { fspName } = useFileBrowserContext();

  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [formatJson, setFormatJson] = useState<boolean>(true);

  // Instant binary detection by file extension — no server round-trip needed
  const knownBinary = isKnownBinaryExtension(file.name);

  // HEAD request for accurate binary detection on unknown extensions.
  // Skip it when the extension already tells us it's binary.
  const metadataQuery = useFileMetadataQuery(
    knownBinary ? undefined : fspName,
    file.path
  );

  // True as soon as we have a definitive answer from either source
  const isBinary = knownBinary || metadataQuery.data?.isBinary === true;

  // Fetch first 512 bytes immediately for binary files (or likely-binary files)
  // so the hex preview appears without waiting for HEAD.
  const binaryPreviewQuery = useFileBinaryPreviewQuery(
    fspName,
    file.path,
    knownBinary || isBinary
  );

  // Only fetch full text content once we know the file is not binary
  const metadataSettled = knownBinary || metadataQuery.isSuccess;
  const shouldFetchContent = metadataSettled && !isBinary;
  const contentQuery = useFileContentQuery(
    shouldFetchContent ? fspName : undefined,
    file.path
  );

  const language = getLanguageFromExtension(file.name);
  const isJsonFile = language === 'json';

  // Detect dark mode from document
  useEffect(() => {
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

  const renderViewer = () => {
    // Binary file: show hex preview as soon as the first bytes arrive
    if (isBinary) {
      if (binaryPreviewQuery.isPending) {
        return (
          <Typography className="p-4 text-foreground">
            Loading binary preview...
          </Typography>
        );
      }
      if (binaryPreviewQuery.error) {
        return (
          <Typography className="p-4 text-foreground/60">
            Binary file — preview unavailable
          </Typography>
        );
      }
      return (
        <HexDump
          bytes={binaryPreviewQuery.data!}
          totalFileSize={file.size ?? undefined}
        />
      );
    }

    // Not-yet-determined: waiting for HEAD on an unknown extension
    if (!metadataSettled || metadataQuery.isLoading) {
      return (
        <Typography className="p-4 text-foreground">
          Loading file content...
        </Typography>
      );
    }

    if (metadataQuery.error) {
      return (
        <Typography className="p-4 text-error">
          Error: {metadataQuery.error.message}
        </Typography>
      );
    }

    if (contentQuery.isLoading) {
      return (
        <Typography className="p-4 text-foreground">
          Loading file content...
        </Typography>
      );
    }

    if (contentQuery.error) {
      return (
        <Typography className="p-4 text-error">
          Error: {contentQuery.error.message}
        </Typography>
      );
    }

    const content = contentQuery.data ?? '';

    // Format JSON if toggle is enabled and content is valid JSON
    let displayContent = content;
    if (isJsonFile && formatJson && content) {
      try {
        const parsed = JSON.parse(content);
        displayContent = JSON.stringify(parsed, null, 2);
      } catch {
        // If JSON parsing fails, show original content
        displayContent = content;
      }
    }

    // Get the theme's code styles and merge with padding bottom for scrollbar
    const theme = isDarkMode ? materialDark : coy;
    const themeCodeStyles = theme['code[class*="language-"]'] || {};
    const mergedCodeTagProps = {
      style: {
        ...themeCodeStyles,
        paddingBottom: '2em'
      }
    };

    return (
      <SyntaxHighlighter
        codeTagProps={mergedCodeTagProps}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '14px',
          lineHeight: '1.5',
          overflow: 'visible',
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 'fit-content'
        }}
        language={language}
        showLineNumbers={false}
        style={isDarkMode ? materialDark : coy}
        wrapLines={true}
        wrapLongLines={true}
      >
        {displayContent}
      </SyntaxHighlighter>
    );
  };

  // Determine if we should show JSON format toggle
  const showJsonToggle = isJsonFile && !isBinary;

  const downloadUrl = fspName ? getFileURL(fspName, file.path) : null;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* File info header */}
      <div className="px-4 py-2 bg-surface-light border-b border-surface flex items-center justify-between shrink-0">
        <div className="min-w-0 flex-1 mr-4">
          <Typography className="text-foreground truncate" type="h6">
            {file.name}
          </Typography>
          <Typography className="text-foreground">
            {formatFileSize(file.size)} • Last modified:{' '}
            {formatUnixTimestamp(file.last_modified)}
          </Typography>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {showJsonToggle ? (
            <div className="flex items-center gap-2">
              <Typography className="text-foreground text-sm whitespace-nowrap">
                Format JSON
              </Typography>
              <Switch
                checked={formatJson}
                onChange={() => setFormatJson(!formatJson)}
              />
            </div>
          ) : null}
          {downloadUrl ? (
            <a download={file.name} href={downloadUrl} title="Download file">
              <HiOutlineDownload className="text-foreground hover:text-primary text-xl" />
            </a>
          ) : null}
        </div>
      </div>

      {/* File content viewer */}
      <div className="flex-1 overflow-auto bg-background min-h-0">
        {renderViewer()}
      </div>
    </div>
  );
}
