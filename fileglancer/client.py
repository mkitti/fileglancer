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

from fileglancer.filestore import FileInfo
from fileglancer.model import FileSharePath, Job, NeuroglancerShortLink, ProxiedPath

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
    """

    def __init__(self, url: Optional[str] = None, token: Optional[str] = None,
                 timeout: float = 60.0):
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

    # --- File operations ---

    def ls(self, path: str) -> List[FileInfo]:
        """List the contents of a directory.

        Each returned FileInfo carries an absolute_path, so results can be fed
        straight back into any other method.

        Raises FileglancerError if the path is not a directory. The API omits
        the file list for non-directories, so without this check ls() on a
        file would return an empty list, which a caller would read as an
        empty directory.
        """
        fsp_name, subpath = self._resolve(path)
        data = self._request("GET", f"/api/files/{fsp_name}",
                             params={"subpath": subpath}).json()
        if not data["info"].get("is_dir"):
            raise FileglancerError(f"Not a directory: {path}")
        return [FileInfo(**entry) for entry in data.get("files", [])]

    def stat(self, path: str) -> FileInfo:
        """Get metadata for a single file or directory."""
        fsp_name, subpath = self._resolve(path)
        data = self._request("GET", f"/api/files/{fsp_name}",
                             params={"subpath": subpath}).json()
        return FileInfo(**data["info"])

    def mkdir(self, path: str) -> None:
        """Create a directory. The parent directory must already exist."""
        fsp_name, subpath = self._resolve(path)
        self._request("POST", f"/api/files/{fsp_name}",
                      params={"subpath": subpath}, json={"type": "directory"})

    def rename(self, src: str, dst: str) -> None:
        """Rename or move a file or directory within one file share."""
        src_fsp, src_subpath = self._resolve(src)
        dst_fsp, dst_subpath = self._resolve(dst)
        if src_fsp != dst_fsp:
            # The underlying PATCH /api/files cannot move across shares, so
            # fail here with a useful message rather than on a 400.
            raise FileglancerError(
                f"Cannot move between file shares: {src!r} is on {src_fsp!r} "
                f"but {dst!r} is on {dst_fsp!r}. Both must be on the same "
                f"file share.")
        self._request("PATCH", f"/api/files/{src_fsp}",
                      params={"subpath": src_subpath},
                      json={"path": dst_subpath})

    def delete(self, path: str) -> None:
        """Delete a file or an empty directory."""
        fsp_name, subpath = self._resolve(path)
        self._request("DELETE", f"/api/files/{fsp_name}",
                      params={"subpath": subpath})

    def read(self, path: str) -> bytes:
        """Read a file's contents."""
        fsp_name, subpath = self._resolve(path)
        return self._request("GET", f"/api/content/{fsp_name}",
                             params={"subpath": subpath}).content

    def write(self, path: str, data: bytes) -> int:
        """Write bytes to a file, creating or replacing it.

        The parent directory must already exist. Returns the number of bytes
        written.
        """
        fsp_name, subpath = self._resolve(path)
        response = self._request("PUT", f"/api/content/{fsp_name}",
                                 params={"subpath": subpath}, content=data)
        return response.json()["bytes_written"]

    # --- Data links ---

    def _absolutize(self, link: ProxiedPath) -> ProxiedPath:
        """Rewrite a ProxiedPath's FSP-relative path to an absolute one.

        The REST API defines ProxiedPath.path as relative to the file share.
        This client presents absolute paths throughout, so the value is
        replaced here. fsp_name is left in place for reference.
        """
        return link.model_copy(
            update={"path": self.abspath(link.fsp_name, link.path)})

    def create_data_link(self, path: str,
                         url_prefix: Optional[str] = None) -> ProxiedPath:
        """Create a data link that serves a folder over HTTP.

        Args:
            path: Absolute path to the folder to share.
            url_prefix: The URL segment after the sharing key. Defaults to the
                folder's basename.
        """
        fsp_name, subpath = self._resolve(path)
        params: Dict[str, Any] = {"fsp_name": fsp_name, "path": subpath}
        if url_prefix is not None:
            params["url_prefix"] = url_prefix
        data = self._request("POST", "/api/proxied-path", params=params).json()
        return self._absolutize(ProxiedPath(**data))

    def data_links(self) -> List[ProxiedPath]:
        """List the caller's data links."""
        data = self._request("GET", "/api/proxied-path").json()
        return [self._absolutize(ProxiedPath(**p)) for p in data["paths"]]

    def data_link(self, sharing_key: str) -> ProxiedPath:
        """Get one data link by its sharing key."""
        data = self._request("GET", f"/api/proxied-path/{sharing_key}").json()
        return self._absolutize(ProxiedPath(**data))

    def delete_data_link(self, sharing_key: str) -> None:
        """Delete a data link."""
        self._request("DELETE", f"/api/proxied-path/{sharing_key}")

    # --- Neuroglancer links ---

    def create_ng_link(self, state: Dict[str, Any],
                       url_base: str = NEUROGLANCER_URL,
                       title: Optional[str] = None,
                       short_name: Optional[str] = None) -> str:
        """Store a Neuroglancer state and return a shortened viewer URL.

        Args:
            state: A Neuroglancer state as a plain dict. This is exactly what
                neuroglancer.ViewerState.to_json() returns, so no dependency
                on the neuroglancer package is needed.
            url_base: The Neuroglancer instance the link should open in.
            title: Optional title shown in the browser tab.
            short_name: Optional human-friendly suffix for the link.
        """
        payload: Dict[str, Any] = {"state": state, "url_base": url_base}
        if title is not None:
            payload["title"] = title
        if short_name is not None:
            payload["short_name"] = short_name
        data = self._request("POST", "/api/neuroglancer/nglinks",
                             json=payload).json()
        return data["neuroglancer_url"]

    def ng_links(self) -> List[NeuroglancerShortLink]:
        """List the caller's stored Neuroglancer links."""
        data = self._request("GET", "/api/neuroglancer/nglinks").json()
        return [NeuroglancerShortLink(**link) for link in data["links"]]

    def delete_ng_link(self, short_key: str) -> None:
        """Delete a stored Neuroglancer link."""
        self._request("DELETE", f"/api/neuroglancer/nglinks/{short_key}")

    # --- Jobs ---

    def jobs(self, status: Optional[str] = None) -> List[Job]:
        """List the caller's jobs, optionally filtered by status."""
        params = {"status": status} if status else None
        data = self._request("GET", "/api/jobs", params=params).json()
        return [Job(**job) for job in data["jobs"]]

    def job(self, job_id: int) -> Job:
        """Get a single job by id."""
        return Job(**self._request("GET", f"/api/jobs/{job_id}").json())

    def submit_job(self, app_url: str, entry_point_id: str, **kwargs) -> Job:
        """Submit a job.

        Args:
            app_url: The app's repository URL.
            entry_point_id: Which entry point of the app to run.
            **kwargs: Any other field accepted by the /api/jobs endpoint, such
                as parameters, resources, name, env, or container.
        """
        payload = {"app_url": app_url, "entry_point_id": entry_point_id, **kwargs}
        return Job(**self._request("POST", "/api/jobs", json=payload).json())

    def cancel_job(self, job_id: int) -> None:
        """Cancel a running or pending job."""
        self._request("POST", f"/api/jobs/{job_id}/cancel")
