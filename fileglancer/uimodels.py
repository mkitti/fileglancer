from typing import Optional
from pydantic import BaseModel, Field


# TODO:
# These are candidates to be extracted to a shared library
# They have all been copied from fileglancer-central/fileglancer-central/model.py

class FileSharePath(BaseModel):
    """A file share path from the database"""
    name: str = Field(
        description="The name of the file share, which uniquely identifies the file share."
    )
    zone: str = Field(
        description="The zone of the file share, for grouping paths in the UI."
    )
    group: Optional[str] = Field(
        description="The group that owns the file share",
        default=None
    )
    storage: Optional[str] = Field(
        description="The storage type of the file share (home, primary, scratch, etc.)",
        default=None
    )
    mount_path: str = Field(
        description="The path where the file share is mounted on the local machine"
    )
    mac_path: Optional[str] = Field(
        description="The path used to mount the file share on Mac (e.g. smb://server/share)",
        default=None
    )
    windows_path: Optional[str] = Field(
        description="The path used to mount the file share on Windows (e.g. \\\\server\\share)",
        default=None
    )
    linux_path: Optional[str] = Field(
        description="The path used to mount the file share on Linux (e.g. /unix/style/path)",
        default=None
    )


class ProxiedPath(BaseModel):
    """A proxied path which is used to share a file system path via a URL"""
    username: str = Field(
        description="The username of the user who owns this proxied path"
    )
    sharing_key: str = Field(
        description="The sharing key is part of the URL proxy path. It is used to uniquely identify the proxied path."
    )
    sharing_name: str = Field(
        description="The sharing path is part of the URL proxy path. It is mainly used to provide file extension information to the client."
    )
    mount_path: str = Field(
        description="The root path on the file system to be proxied"
    )


class ProxiedPathResponse(BaseModel):
    paths: list[ProxiedPath] = Field(
        description="A list of proxied paths"
    )
