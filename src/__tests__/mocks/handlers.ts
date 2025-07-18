//https://mswjs.io/docs/quick-start

import { name } from 'happy-dom/lib/PropertySymbol.js';
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('http://localhost:3000/api/fileglancer/proxied-path', () => {
    return HttpResponse.json({
      paths: [
        {
          username: 'testuser',
          sharing_key: 'testkey',
          sharing_name: 'testshare',
          path: '/test/path',
          fsp_name: 'test_fsp',
          created_at: '2025-07-08T15:56:42.588942',
          updated_at: '2025-07-08T15:56:42.588942',
          url: 'http://127.0.0.1:7878/files/testkey/test/path'
        }
      ]
    });
  }),
  http.get(
    'http://localhost:3000/api/fileglancer/preference',
    ({ request }) => {
      const url = new URL(request.url);
      const queryParam = url.searchParams.get('key');
      if (queryParam === 'path') {
        return HttpResponse.json({
          value: ['linux_path']
        });
      } else if (queryParam === 'fileSharePath') {
        return HttpResponse.json({
          value: []
        });
      } else if (queryParam === 'zone') {
        return HttpResponse.json({
          value: []
        });
      } else if (queryParam === 'folder') {
        return HttpResponse.json({
          value: []
        });
      }
    }
  ),
  http.get('http://localhost:3000/api/fileglancer/file-share-paths', () => {
    return HttpResponse.json({
      paths: [
        {
          name: 'test_fsp',
          zone: 'Zone1',
          group: 'group1',
          storage: 'primary',
          mount_path: '/test/path',
          mac_path: 'smb://test/path',
          windows_path: '\\\\test\\path',
          linux_path: '/test/path'
        },
        {
          name: 'another_fsp',
          zone: 'Zone2',
          group: 'group2',
          storage: 'primary',
          mount_path: '/another/path',
          mac_path: 'smb://another/path',
          windows_path: '\\\\another\\path',
          linux_path: '/another/path'
        }
      ]
    });
  })
];
