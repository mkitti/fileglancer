"""Python client for the Fileglancer HTTP API.

Authenticates with an API token created in the Fileglancer web UI, and
operates on absolute filesystem paths rather than Fileglancer's internal
(file share, relative path) pair.

    from fileglancer import Fileglancer

    fg = Fileglancer()  # reads FILEGLANCER_URL and FILEGLANCER_TOKEN
    link = fg.create_data_link("/nearline/alice/sample.zarr")
"""
import os
from typing import Any, Dict, List, Optional, Tuple

import httpx

from fileglancer.model import FileSharePath

# Neuroglancer base URL used when the caller does not supply one. The server
# has no configured default and POST /api/neuroglancer/nglinks requires
# url_base when given a state directly, so the default lives here.
NEUROGLANCER_URL = "https://neuroglancer-demo.appspot.com"


class FileglancerError(Exception):
    """Raised for API errors and for paths that match no file share."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class Fileglancer:
    """A client for the Fileglancer HTTP API.

    Args:
        url: Fileglancer server URL. Defaults to $FILEGLANCER_URL.
        token: An API token created in the web UI. Defaults to
            $FILEGLANCER_TOKEN.
        timeout: Per-request timeout in seconds.
        transport: An httpx transport, for testing against an ASGI app.
    """

    def __init__(self, url: Optional[str] = None, token: Optional[str] = None,
                 timeout: float = 60.0,
                 transport: Optional[httpx.BaseTransport] = None):
        url = url or os.environ.get("FILEGLANCER_URL")
        token = token or os.environ.get("FILEGLANCER_TOKEN")
        if not url:
            raise FileglancerError(
                "No Fileglancer server URL. Pass url= or set FILEGLANCER_URL.")
        if not token:
            raise FileglancerError(
                "No API token. Pass token= or set FILEGLANCER_TOKEN. Create a "
                "token on the API Tokens page of the Fileglancer web UI.")

        self._client = httpx.Client(
            base_url=url.rstrip("/"),
            headers={"Authorization": f"Bearer {token}"},
            timeout=timeout,
            transport=transport,
            follow_redirects=True,
        )
        self._fsp_cache: Optional[List[FileSharePath]] = None

    def close(self) -> None:
        """Close the underlying HTTP connection pool."""
        self._client.close()

    def __enter__(self) -> "Fileglancer":
        return self

    def __exit__(self, *exc_info) -> None:
        self.close()

    # --- HTTP plumbing ---

    def _request(self, method: str, path: str, **kwargs) -> httpx.Response:
        """Make a request, turning any error response into FileglancerError."""
        response = self._client.request(method, path, **kwargs)
        if response.status_code >= 400:
            try:
                body = response.json()
                # The server's exception handlers rewrite every error body to
                # {"error": ...}; 'detail' is accepted as a fallback in case a
                # response ever bypasses those handlers.
                detail = body.get("error") or body.get("detail") or response.text
            except ValueError:
                detail = response.text
            raise FileglancerError(f"{method} {path} failed: {detail}",
                                   status_code=response.status_code)
        return response

    # --- File shares and path resolution ---

    def file_share_paths(self) -> List[FileSharePath]:
        """List the server's file shares. Cached; call refresh() to re-fetch."""
        if self._fsp_cache is None:
            data = self._request("GET", "/api/file-share-paths").json()
            self._fsp_cache = [FileSharePath(**p) for p in data["paths"]]
        return self._fsp_cache

    def refresh(self) -> None:
        """Drop the cached file share list."""
        self._fsp_cache = None

    def _resolve(self, path: str) -> Tuple[str, str]:
        """Resolve an absolute path to (file share name, relative path).

        Mirrors resolvePathToFsp in frontend/src/utils/pathHandling.ts: the
        longest matching prefix across every mount form wins, and the
        remainder must be empty or start with '/'. That last condition is what
        keeps '/misc/public' from swallowing '/misc/public-archive'.

        Accepts Linux, Mac (smb://) and Windows (UNC) mount forms, so a path
        pasted from any client platform resolves.
        """
        normalized = path.strip().replace("\\", "/")

        best_fsp: Optional[FileSharePath] = None
        best_prefix = ""
        for fsp in self.file_share_paths():
            candidates = (fsp.mount_path, fsp.linux_path, fsp.mac_path,
                          fsp.windows_path)
            for candidate in candidates:
                if not candidate:
                    continue
                candidate = candidate.replace("\\", "/").rstrip("/")
                if len(candidate) <= len(best_prefix):
                    continue
                if not normalized.startswith(candidate):
                    continue
                remainder = normalized[len(candidate):]
                if remainder and not remainder.startswith("/"):
                    continue
                best_fsp, best_prefix = fsp, candidate

        if best_fsp is None:
            mounts = ", ".join(sorted(f.mount_path
                                      for f in self.file_share_paths()))
            raise FileglancerError(
                f"No file share matches {path!r}. Available mount points: {mounts}")

        return best_fsp.name, normalized[len(best_prefix):].strip("/")

    def abspath(self, fsp_name: str, path: str = "") -> str:
        """Build an absolute path from a file share name and relative path."""
        for fsp in self.file_share_paths():
            if fsp.name == fsp_name:
                root = fsp.mount_path.rstrip("/")
                return f"{root}/{path}" if path else root
        raise FileglancerError(f"Unknown file share: {fsp_name}")
