"""
A module that provides a simple interface for interacting with a file system, 
rooted at a specific directory.
"""

import os

from pydantic import BaseModel
from typing import Optional, List, Generator
import stat
import pwd
import grp

DEFAULT_BUFFER_SIZE = 8192

class FileInfo(BaseModel):
    """
    A class that represents a file or directory in the file system.
    """
    name: str
    path: str
    size: int
    is_dir: bool
    permissions: str
    owner: Optional[str] = None
    group: Optional[str] = None
    last_modified: Optional[float] = None

    @classmethod
    def from_stat(cls, path: str, stat_result: os.stat_result):
        """Create FileInfo from os.stat_result"""
        is_dir = stat.S_ISDIR(stat_result.st_mode)
        size = 0 if is_dir else stat_result.st_size
        return cls(
            name=os.path.basename(path),
            path=path,
            size=size,
            is_dir=is_dir,
            permissions=stat.filemode(stat_result.st_mode),
            owner=pwd.getpwuid(stat_result.st_uid).pw_name,
            group=grp.getgrgid(stat_result.st_gid).gr_name,
            last_modified=stat_result.st_mtime
        )


class Filestore:
    """
    A class that provides a simple interface for interacting with a file system, 
    rooted at a specific directory.
    """

    def __init__(self, root_path: str):
        """
        Create a Filestore with the given root path.
        """
        self.root_path = os.path.abspath(root_path)

    def _check_path_in_root(self, path: str) -> str:
        """
        Check if a path is within the root directory and return the full path.
        Raises ValueError if path attempts to escape root directory.
        """
        full_path = os.path.abspath(os.path.join(self.root_path, path))
        if not full_path.startswith(self.root_path):
            raise ValueError(f"Path {path} attempts to access outside of root directory")
        print(f"Path: {path}")
        print(f"Full path: {full_path}")
        return full_path

    def get_root_path(self) -> str:
        """
        Get the root path of the Filestore.
        """
        return self.root_path
    
    def get_file_info(self, path: str) -> FileInfo:
        """
        Get the FileInfo for a file or directory at the given path.

        Args:
            path (str): The relative path to the file or directory to get the FileInfo for.
        
        Raises:
            ValueError: If path attempts to escape root directory
        """
        full_path = self._check_path_in_root(path)
        stat_result = os.stat(full_path)
        return FileInfo.from_stat(full_path, stat_result)
    
    def get_file_list(self, path: str) -> List[FileInfo]:
        """
        Get the list of FileInfo for files and directories at the given path.

        Args:
            path (str): The relative path to the directory to list.
            
        Raises:
            ValueError: If path attempts to escape root directory
        """
        full_path = self._check_path_in_root(path)
        try:
            children = []
            for entry in os.listdir(full_path):
                entry_path = os.path.join(full_path, entry)
                try:
                    stat_result = os.stat(entry_path)
                    file_info = FileInfo.from_stat(entry_path, stat_result)
                    children.append(file_info)
                except (FileNotFoundError, PermissionError):
                    continue
            return children
        except (FileNotFoundError, PermissionError):
            return []

    def stream_file_contents(self, path: str, buffer_size: int = DEFAULT_BUFFER_SIZE) -> Generator[bytes, None, None]:
        """
        Stream the contents of a file at the given path.

        Args:
            path (str): The path to the file to stream.
            buffer_size (int): The size of the buffer to use when reading the file. 
                Defaults to DEFAULT_BUFFER_SIZE, which is 8192 bytes.
                
        Raises:
            ValueError: If path attempts to escape root directory
        """
        full_path = self._check_path_in_root(path)
        with open(full_path, 'rb') as file:
            while True:
                chunk = file.read(buffer_size)
                if not chunk:
                    break
                yield chunk

    def rename_file(self, old_path: str, new_path: str):
        """
        Rename a file at the given old path to the new path.

        Args:
            old_path (str): The path to the file to rename.
            new_path (str): The new path for the file.
            
        Raises:
            ValueError: If either path attempts to escape root directory
        """
        full_old_path = self._check_path_in_root(old_path)
        full_new_path = self._check_path_in_root(new_path)
        os.rename(full_old_path, full_new_path)

    def delete_file_or_dir(self, path: str):
        """
        Delete a file or (empty) directory at the given path.

        Args:
            path (str): The relative path to the file to delete.
            
        Raises:
            ValueError: If path attempts to escape root directory
        """
        full_path = self._check_path_in_root(path)
        if os.path.isdir(full_path):
            os.rmdir(full_path)
        else:
            os.remove(full_path)
