# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Integration tests for `WithSOX302Flow` logic."""

import collections

import ddt

from ggrc.models import all_models
from ggrc.models.mixins import with_sox_302
from integration import ggrc as integration_tests_ggrc
from integration.ggrc.models import factories as ggrc_factories


class BaseTestWithSOX302(integration_tests_ggrc.TestCase):
  """Base class for test cases for `WithSOX302Flow` logic."""

  def _login(self):
    """Make `self.client` to exec further requests as if issuer's logged in."""
    self.client.get("/login")

  @staticmethod
  def _get_query_by_audit_for(obj_type, audit):
    # type: (db.Model, models.Audit) -> sqlalchemy.Query
    """Build sqlalchemy query for specific object type filtered by audit.

    Build sqlalchemy query for objects of type `obj_type` which are related to
    given audit `audit`. This helper method allows to build DB query when audit
    ID is known and audit isn't detached from a session yet and use this query
    later when audit might become detached from a session.

    Args:
        obj_type (db.Model): Class instance of objects to query.
        audit (models.Audit): Audit instance whose related objects should be
          queried.

    Returns:
      Sqlalchemy.Query object which could be used for later queries.
    """
    return obj_type.query.filter(obj_type.audit_id == audit.id)

  @staticmethod
  def _get_query_to_refresh(obj):
    # type: (db.Model, models.Audit) -> sqlalchemy.Query
    """Build sqlalchemy query for the given object to use it later.

    Build sqlalchemy query for the given object. This helper method allows to
    build DB query when object ID is known and it isn't detached from a session
    yet and use this query later when object might become detached from a
    session to refresh it.

    Args:
        obj (db.Model): Instance of db.Model class represeting object to query.

    Returns:
      Sqlalchemy.Query object which could be used for later queries.
    """
    return obj.__class__.query.filter(obj.__class__.id == obj.id)

  def _assert_sox_302_enabled_flag(self, obj, expected_value):
    # type: (db.Model, bool) -> None
    """Assert that `sox_302_enabled` flag has expected value on object.

    For this assertion to pass, following conditions should be met:
      - Given object should be derived from `WithSOX302Flow` mixin;
      - Value of `sox_302_enabled` on object should match `expected_value`.

    Args:
      obj (db.Model): Instance of db.Model class on which value of
        `sox_302_enabled` flag should be checked.
      expected_value (bool): Expected value of `sox_302_enabled` flag on the
        given object.
    """
    self.assertTrue(isinstance(obj, with_sox_302.WithSOX302Flow))
    self.assertIsNotNone(obj)
    self.assertEqual(
        obj.sox_302_enabled,
        expected_value,
    )
