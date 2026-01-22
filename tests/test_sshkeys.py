"Tests for SSH key management utilities with secure bytearray handling."

import os
import subprocess
import tempfile
import pytest
from pydantic import SecretStr

from fileglancer.sshkeys import (
    _wipe_bytearray,
    read_file_to_bytearray,
    get_key_content,
    SSHKeyContentResponse,
    generate_ssh_key,
)


class TestWipeBytearray:
    """Tests for the _wipe_bytearray helper function."""

    def test_wipe_bytearray_zeros_all_bytes(self):
        """Verify that _wipe_bytearray overwrites all bytes with zeros."""
        data = bytearray(b"sensitive data here")
        original_length = len(data)

        _wipe_bytearray(data)

        assert len(data) == original_length
        assert all(b == 0 for b in data)

    def test_wipe_bytearray_empty(self):
        """Verify that wiping an empty bytearray doesn't raise."""
        data = bytearray()
        _wipe_bytearray(data)
        assert len(data) == 0

    def test_wipe_bytearray_binary_data(self):
        """Verify that binary data (non-UTF8) is properly wiped."""
        data = bytearray(bytes(range(256)))
        _wipe_bytearray(data)
        assert all(b == 0 for b in data)


class TestReadFileToBytearray:
    """Tests for reading files into bytearrays."""

    def test_read_file_into_bytearray(self):
        """Verify file contents are read into a bytearray."""
        test_content = b"-----BEGIN OPENSSH PRIVATE KEY-----\ntest key content\n-----END OPENSSH PRIVATE KEY-----\n"

        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(test_content)
            temp_path = f.name

        try:
            result = read_file_to_bytearray(temp_path)

            assert isinstance(result, bytearray)
            assert bytes(result) == test_content

            # Clean up the bytearray
            _wipe_bytearray(result)
        finally:
            os.unlink(temp_path)

    def test_read_returns_mutable_bytearray(self):
        """Verify the returned bytearray is mutable and can be wiped."""
        test_content = b"secret key data"

        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(test_content)
            temp_path = f.name

        try:
            result = read_file_to_bytearray(temp_path)

            # Verify it's mutable by modifying it
            result[0] = 0
            assert result[0] == 0

            # Verify we can wipe it completely
            _wipe_bytearray(result)
            assert all(b == 0 for b in result)
        finally:
            os.unlink(temp_path)

    def test_read_nonexistent_file_raises(self):
        """Verify reading a nonexistent file raises an error."""
        with pytest.raises(FileNotFoundError):
            read_file_to_bytearray("/nonexistent/path/to/key")


class TestGetKeyContent:
    """Tests for the unified get_key_content function."""

    def test_returns_bytearray_for_public_key(self):
        """Verify get_key_content returns a bytearray for public keys."""
        with tempfile.TemporaryDirectory() as ssh_dir:
            pubkey_content = b"ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest test@example.com"
            pubkey_path = os.path.join(ssh_dir, "id_ed25519.pub")

            with open(pubkey_path, 'wb') as f:
                f.write(pubkey_content)

            result = get_key_content(ssh_dir, "id_ed25519", "public")

            assert isinstance(result, bytearray)
            assert bytes(result) == pubkey_content

            # Clean up
            _wipe_bytearray(result)

    def test_returns_bytearray_for_private_key(self):
        """Verify get_key_content returns a bytearray for private keys."""
        with tempfile.TemporaryDirectory() as ssh_dir:
            private_key_content = b"-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----\n"
            private_key_path = os.path.join(ssh_dir, "id_ed25519")

            with open(private_key_path, 'wb') as f:
                f.write(private_key_content)

            result = get_key_content(ssh_dir, "id_ed25519", "private")

            assert isinstance(result, bytearray)
            assert bytes(result) == private_key_content

            # Clean up
            _wipe_bytearray(result)

    def test_returned_bytearray_is_wipeable(self):
        """Verify the returned bytearray can be securely wiped."""
        with tempfile.TemporaryDirectory() as ssh_dir:
            key_content = b"secret key data"
            key_path = os.path.join(ssh_dir, "id_ed25519")

            with open(key_path, 'wb') as f:
                f.write(key_content)

            result = get_key_content(ssh_dir, "id_ed25519", "private")

            # Wipe and verify
            _wipe_bytearray(result)
            assert all(b == 0 for b in result)

    def test_nonexistent_public_key_raises(self):
        """Verify requesting a nonexistent public key raises ValueError."""
        with tempfile.TemporaryDirectory() as ssh_dir:
            with pytest.raises(ValueError, match="not found"):
                get_key_content(ssh_dir, "nonexistent_key", "public")

    def test_nonexistent_private_key_raises(self):
        """Verify requesting a nonexistent private key raises ValueError."""
        with tempfile.TemporaryDirectory() as ssh_dir:
            with pytest.raises(ValueError, match="not found"):
                get_key_content(ssh_dir, "nonexistent_key", "private")

    def test_invalid_key_type_raises(self):
        """Verify invalid key_type raises ValueError."""
        with tempfile.TemporaryDirectory() as ssh_dir:
            with pytest.raises(ValueError, match="Invalid key_type"):
                get_key_content(ssh_dir, "id_ed25519", "invalid")


class TestSSHKeyContentResponse:
    """Tests for the SSHKeyContentResponse secure streaming response class."""

    @pytest.mark.asyncio
    async def test_response_streams_content_in_chunks(self):
        """Verify the response streams content in fixed-size chunks with more_body flag."""
        # 44 bytes total, with default chunk_size=22, should be 2 chunks
        key_content = bytearray(b"A" * 22 + b"B" * 22)
        response = SSHKeyContentResponse(key_content)

        sent_messages = []
        captured_bodies = []

        async def mock_receive():
            return {"type": "http.request", "body": b""}

        async def mock_send(message):
            sent_messages.append(message)
            # Capture a copy of the body before it gets wiped
            if message.get("type") == "http.response.body":
                captured_bodies.append(bytes(message["body"]))

        scope = {"type": "http"}

        await response(scope, mock_receive, mock_send)

        # Verify response start was sent
        assert sent_messages[0]["type"] == "http.response.start"
        assert sent_messages[0]["status"] == 200

        # Verify streaming: 2 chunks + 1 final empty message = 3 body messages
        body_messages = [m for m in sent_messages if m.get("type") == "http.response.body"]
        assert len(body_messages) == 3

        # All but the last should have more_body=True
        for msg in body_messages[:-1]:
            assert msg["more_body"] is True

        # Final message should have more_body=False and empty body
        assert body_messages[-1]["more_body"] is False
        assert captured_bodies[-1] == b""

        # Each chunk should be exactly 22 bytes
        assert len(captured_bodies[0]) == 22
        assert len(captured_bodies[1]) == 22

        # Reassembled content should match original
        reassembled = b"".join(captured_bodies[:-1])  # Exclude final empty
        assert reassembled == b"A" * 22 + b"B" * 22

    @pytest.mark.asyncio
    async def test_response_handles_partial_final_chunk(self):
        """Verify the response handles content that doesn't divide evenly into chunks."""
        # 50 bytes with chunk_size=22: chunks of 22, 22, 6
        key_content = bytearray(b"X" * 50)
        response = SSHKeyContentResponse(key_content)

        sent_messages = []
        captured_bodies = []

        async def mock_receive():
            return {"type": "http.request", "body": b""}

        async def mock_send(message):
            sent_messages.append(message)
            if message.get("type") == "http.response.body":
                captured_bodies.append(bytes(message["body"]))

        scope = {"type": "http"}

        await response(scope, mock_receive, mock_send)

        # Verify response start was sent
        assert sent_messages[0]["type"] == "http.response.start"
        assert sent_messages[0]["status"] == 200

        # 3 content chunks + 1 final empty = 4 body messages
        body_messages = [m for m in sent_messages if m.get("type") == "http.response.body"]
        assert len(body_messages) == 4

        # Chunk sizes: 22, 22, 6
        assert len(captured_bodies[0]) == 22
        assert len(captured_bodies[1]) == 22
        assert len(captured_bodies[2]) == 6
        assert captured_bodies[3] == b""

        # Reassembled content should match original
        reassembled = b"".join(captured_bodies[:-1])
        assert reassembled == b"X" * 50

    @pytest.mark.asyncio
    async def test_response_wipes_bytearray_after_streaming(self):
        """Verify the bytearray is wiped after streaming completes."""
        key_content = bytearray(b"sensitive private key data here")
        original_length = len(key_content)
        response = SSHKeyContentResponse(key_content)

        async def mock_receive():
            return {"type": "http.request", "body": b""}

        async def mock_send(message):
            pass

        scope = {"type": "http"}

        await response(scope, mock_receive, mock_send)

        # Verify the bytearray was wiped
        assert len(key_content) == original_length
        assert all(b == 0 for b in key_content)

    @pytest.mark.asyncio
    async def test_response_wipes_bytearray_even_on_error(self):
        """Verify the bytearray is wiped even if streaming fails."""
        key_content = bytearray(b"sensitive data for testing")
        response = SSHKeyContentResponse(key_content)

        async def mock_receive():
            return {"type": "http.request", "body": b""}

        async def mock_send(message):
            if message["type"] == "http.response.body":
                raise Exception("Simulated send error")

        scope = {"type": "http"}

        with pytest.raises(Exception, match="Simulated send error"):
            await response(scope, mock_receive, mock_send)

        # Verify the bytearray was still wiped despite the error
        assert all(b == 0 for b in key_content)

    def test_response_has_correct_content_type(self):
        """Verify the response has application/octet-stream content type for streaming."""
        key_content = bytearray(b"test")
        response = SSHKeyContentResponse(key_content)

        assert response.media_type == "application/octet-stream"

        # Clean up
        _wipe_bytearray(key_content)

    def test_response_accepts_custom_status_code(self):
        """Verify custom status codes are supported."""
        key_content = bytearray(b"test")
        response = SSHKeyContentResponse(key_content, status_code=201)

        assert response.status_code == 201

        # Clean up
        _wipe_bytearray(key_content)

    @pytest.mark.asyncio
    async def test_response_streams_realistic_ssh_key(self):
        """Verify streaming works with a realistic SSH private key format."""
        key_content = bytearray(
            b"-----BEGIN OPENSSH PRIVATE KEY-----\n"
            b"b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtz\n"
            b"c2gtZWQyNTUxOQAAACBGVmJsZnRtcm5yYmx0c21ibmRjc2xibmRzY21ibmRzYwAA\n"
            b"AIhkc21ibmRzY21ibmRzY21ibmRzY21ibmRzY21ibmRzY2RzbWJuZHNjbWJuZHNj\n"
            b"-----END OPENSSH PRIVATE KEY-----\n"
        )
        expected_content = bytes(key_content)
        total_len = len(key_content)
        response = SSHKeyContentResponse(key_content)

        sent_messages = []
        captured_bodies = []

        async def mock_receive():
            return {"type": "http.request", "body": b""}

        async def mock_send(message):
            sent_messages.append(message)
            if message.get("type") == "http.response.body":
                captured_bodies.append(bytes(message["body"]))

        scope = {"type": "http"}

        await response(scope, mock_receive, mock_send)

        # Calculate expected number of chunks (22 bytes each, plus final empty)
        import math
        expected_chunks = math.ceil(total_len / 22) + 1  # +1 for final empty

        body_messages = [m for m in sent_messages if m.get("type") == "http.response.body"]
        assert len(body_messages) == expected_chunks

        # Verify each chunk message has more_body=True (except last)
        for msg in body_messages[:-1]:
            assert msg["more_body"] is True

        # Final message should be empty with more_body=False
        assert body_messages[-1]["more_body"] is False
        assert captured_bodies[-1] == b""

        # Reassembled content should match original
        reassembled = b"".join(captured_bodies[:-1])
        assert reassembled == expected_content

        # Verify bytearray was wiped
        assert all(b == 0 for b in key_content)

    def test_iter_chunks_yields_memoryview_slices(self):
        """Verify _iter_chunks yields memoryview slices without copying."""
        key_content = bytearray(b"A" * 22 + b"B" * 22 + b"C" * 10)
        response = SSHKeyContentResponse(key_content)

        chunks = list(response._iter_chunks())

        # Should have 3 chunks: 22, 22, 10
        assert len(chunks) == 3

        # Each should be a memoryview
        for chunk in chunks:
            assert isinstance(chunk, memoryview)

        # Content and sizes should be correct
        assert len(chunks[0]) == 22
        assert len(chunks[1]) == 22
        assert len(chunks[2]) == 10
        assert bytes(chunks[0]) == b"A" * 22
        assert bytes(chunks[1]) == b"B" * 22
        assert bytes(chunks[2]) == b"C" * 10

        # Clean up
        _wipe_bytearray(key_content)

    def test_iter_chunks_with_custom_chunk_size(self):
        """Verify _iter_chunks respects custom chunk size."""
        key_content = bytearray(b"X" * 100)
        response = SSHKeyContentResponse(key_content, chunk_size=25)

        chunks = list(response._iter_chunks())

        # Should have 4 chunks of 25 bytes each
        assert len(chunks) == 4

        for chunk in chunks:
            assert isinstance(chunk, memoryview)
            assert len(chunk) == 25

        # Clean up
        _wipe_bytearray(key_content)

    def test_iter_chunks_with_small_content(self):
        """Verify _iter_chunks handles content smaller than chunk size."""
        key_content = bytearray(b"small")
        response = SSHKeyContentResponse(key_content)

        chunks = list(response._iter_chunks())

        # Should have 1 chunk
        assert len(chunks) == 1
        assert bytes(chunks[0]) == b"small"

        # Clean up
        _wipe_bytearray(key_content)

    @pytest.mark.asyncio
    async def test_response_with_custom_headers(self):
        """Verify custom headers are included in the response."""
        key_content = bytearray(b"test")
        custom_headers = {"X-Custom-Header": "test-value"}
        response = SSHKeyContentResponse(key_content, headers=custom_headers)

        sent_messages = []

        async def mock_receive():
            return {"type": "http.request", "body": b""}

        async def mock_send(message):
            sent_messages.append(message)

        scope = {"type": "http"}

        await response(scope, mock_receive, mock_send)

        # Check headers in the response start message
        headers = dict(sent_messages[0]["headers"])
        assert b"x-custom-header" in headers or any(
            h[0] == b"x-custom-header" for h in sent_messages[0]["headers"]
        )

    @pytest.mark.asyncio
    async def test_response_omits_content_length_for_chunked_encoding(self):
        """Verify Content-Length header is NOT set to enable chunked transfer encoding."""
        key_content = bytearray(b"test private key with specific length")
        response = SSHKeyContentResponse(key_content)

        sent_messages = []

        async def mock_receive():
            return {"type": "http.request", "body": b""}

        async def mock_send(message):
            sent_messages.append(message)

        scope = {"type": "http"}

        await response(scope, mock_receive, mock_send)

        # Verify Content-Length is NOT in headers (enables chunked encoding)
        headers = sent_messages[0]["headers"]
        header_names = [header_name for header_name, _ in headers]

        assert b"content-length" not in header_names


class TestGenerateSSHKey:
    """Tests for the generate_ssh_key function."""

    def test_generate_key_no_passphrase(self):
        """Verify generating a key with no passphrase."""
        with tempfile.TemporaryDirectory() as ssh_dir:
            key_info = generate_ssh_key(ssh_dir, passphrase=None)

            assert key_info.filename == "id_ed25519"
            key_path = os.path.join(ssh_dir, "id_ed25519")
            assert os.path.exists(key_path)
            assert os.path.exists(key_path + ".pub")

            # Verify it is NOT encrypted
            check_cmd = ['ssh-keygen', '-y', '-f', key_path, '-P', '']
            result = subprocess.run(check_cmd, capture_output=True)
            assert result.returncode == 0

    def test_generate_key_with_passphrase(self):
        """Verify generating a key with a passphrase."""
        with tempfile.TemporaryDirectory() as ssh_dir:
            passphrase_str = "test-passphrase"
            passphrase = SecretStr(passphrase_str)
            key_info = generate_ssh_key(ssh_dir, passphrase=passphrase)

            assert key_info.filename == "id_ed25519"
            key_path = os.path.join(ssh_dir, "id_ed25519")
            assert os.path.exists(key_path)
            assert os.path.exists(key_path + ".pub")

            # Verify it IS encrypted (fails with empty passphrase)
            check_cmd_empty = ['ssh-keygen', '-y', '-f', key_path, '-P', '']
            result_empty = subprocess.run(check_cmd_empty, capture_output=True)
            assert result_empty.returncode != 0

            # Verify it accepts the correct passphrase
            check_cmd_correct = ['ssh-keygen', '-y', '-f', key_path, '-P', passphrase_str]
            result_correct = subprocess.run(check_cmd_correct, capture_output=True)
            assert result_correct.returncode == 0

    def test_generate_key_already_exists_raises(self):
        """Verify generating a key when one already exists raises ValueError."""
        with tempfile.TemporaryDirectory() as ssh_dir:
            # Create a dummy key file
            key_path = os.path.join(ssh_dir, "id_ed25519")
            with open(key_path, 'w') as f:
                f.write("dummy key")

            with pytest.raises(ValueError, match="already exists"):
                generate_ssh_key(ssh_dir)
