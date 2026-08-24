"""Tests for API token storage and CRUD."""
from datetime import datetime, timedelta, UTC

import pytest

from fileglancer.database import (
    ApiTokenDB,
    Base,
    MAX_TOKEN_EXPIRY_DAYS,
    create_api_token,
    create_engine,
    delete_api_token,
    get_api_token_by_id,
    hash_token_secret,
    list_api_tokens,
    sessionmaker,
    touch_api_token,
)


@pytest.fixture
def db_session(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'tokens.db'}")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    engine.dispose()


def test_create_token_returns_plaintext_matching_stored_hash(db_session):
    row, plaintext = create_api_token(db_session, "alice", "laptop", ["files:read"])

    prefix, token_id, secret = plaintext.split("_", 2)
    assert prefix == "fgt"
    assert token_id == row.token_id
    assert len(token_id) == 12
    assert hash_token_secret(secret) == row.token_hash
    # The secret itself is never stored.
    assert secret not in row.token_hash


def test_create_token_defaults_to_30_day_expiry(db_session):
    row, _ = create_api_token(db_session, "alice", "laptop", ["files:read"])

    expires_at = row.expires_at.replace(tzinfo=UTC)
    delta = expires_at - datetime.now(UTC)
    assert timedelta(days=29) < delta <= timedelta(days=30)


def test_create_token_rejects_expiry_above_maximum(db_session):
    with pytest.raises(ValueError, match="between 1 and 365"):
        create_api_token(db_session, "alice", "laptop", ["files:read"],
                         expires_in_days=MAX_TOKEN_EXPIRY_DAYS + 1)


def test_create_token_rejects_zero_day_expiry(db_session):
    with pytest.raises(ValueError, match="between 1 and 365"):
        create_api_token(db_session, "alice", "laptop", ["files:read"],
                         expires_in_days=0)


def test_scopes_are_stored_space_separated_and_sorted(db_session):
    row, _ = create_api_token(db_session, "alice", "laptop",
                              ["links:write", "files:read"])
    assert row.scopes == "files:read links:write"


def test_duplicate_scopes_are_deduplicated(db_session):
    row, _ = create_api_token(db_session, "alice", "laptop",
                              ["files:read", "files:read", "links:write"])

    assert row.scopes == "files:read links:write"


def test_token_ids_are_unique_across_creations(db_session):
    ids = {create_api_token(db_session, "alice", f"t{i}", ["files:read"])[0].token_id
           for i in range(50)}
    assert len(ids) == 50


def test_get_by_id_returns_none_for_unknown_id(db_session):
    assert get_api_token_by_id(db_session, "doesnotexist") is None


def test_list_returns_only_the_callers_tokens(db_session):
    create_api_token(db_session, "alice", "a", ["files:read"])
    create_api_token(db_session, "bob", "b", ["files:read"])

    names = [t.name for t in list_api_tokens(db_session, "alice")]
    assert names == ["a"]


def test_delete_removes_the_row_and_returns_one(db_session):
    row, _ = create_api_token(db_session, "alice", "a", ["files:read"])

    assert delete_api_token(db_session, "alice", row.token_id) == 1
    assert get_api_token_by_id(db_session, row.token_id) is None


def test_delete_refuses_another_users_token(db_session):
    row, _ = create_api_token(db_session, "alice", "a", ["files:read"])

    assert delete_api_token(db_session, "bob", row.token_id) == 0
    assert get_api_token_by_id(db_session, row.token_id) is not None


def test_touch_sets_last_used_when_never_used(db_session):
    row, _ = create_api_token(db_session, "alice", "a", ["files:read"])
    assert row.last_used_at is None

    touch_api_token(db_session, row.token_id)

    assert get_api_token_by_id(db_session, row.token_id).last_used_at is not None


def test_touch_is_a_noop_when_recently_used(db_session):
    row, _ = create_api_token(db_session, "alice", "a", ["files:read"])
    touch_api_token(db_session, row.token_id)
    first = get_api_token_by_id(db_session, row.token_id).last_used_at

    touch_api_token(db_session, row.token_id)

    assert get_api_token_by_id(db_session, row.token_id).last_used_at == first


def test_touch_updates_when_stale(db_session):
    row, _ = create_api_token(db_session, "alice", "a", ["files:read"])
    row.last_used_at = datetime.now(UTC) - timedelta(hours=1)
    db_session.commit()
    stale = row.last_used_at

    touch_api_token(db_session, row.token_id)

    assert get_api_token_by_id(db_session, row.token_id).last_used_at > stale


def test_touch_ignores_unknown_token(db_session):
    touch_api_token(db_session, "doesnotexist")  # must not raise


def test_token_id_contains_no_format_delimiter(db_session):
    """token_id must never contain '_', the delimiter in fgt_<id>_<secret>.

    A token_id containing '_' parses to a truncated id, so the token is
    permanently unusable. Many iterations because the old implementation
    failed only ~17% of the time.
    """
    for i in range(200):
        row, plaintext = create_api_token(db_session, "alice", f"t{i}",
                                          ["files:read"])
        assert "_" not in row.token_id
        prefix, token_id, secret = plaintext.split("_", 2)
        assert token_id == row.token_id
        assert hash_token_secret(secret) == row.token_hash
