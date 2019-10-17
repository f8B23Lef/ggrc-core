# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Integration tests for `WithSOX302Flow` logic."""

import collections

import ddt

from ggrc.models import all_models
from ggrc.models.mixins import with_sox_302
from integration import ggrc as integration_tests_ggrc
from integration.ggrc import api_helper
from integration.ggrc import query_helper
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


@ddt.ddt
class TestImportWithSOX302(BaseTestWithSOX302):
  """Test import of `WithSOX302Flow` objects."""

  @ddt.data(
      {"imported_value": "yes", "exp_value": True},
      {"imported_value": "no", "exp_value": False},
      {"imported_value": "", "exp_value": False},
  )
  @ddt.unpack
  def test_sox_302_tmpl_create(self, imported_value, exp_value):
    """Test SOX302 enabled={exp_value} when create asmt tmpl via import."""
    audit = ggrc_factories.AuditFactory()
    tmpl_q = self._get_query_by_audit_for(
        obj_type=all_models.AssessmentTemplate,
        audit=audit,
    )

    asmt_tmpl_data = collections.OrderedDict([
        ("object_type", "Assessment Template"),
        ("Code*", ""),
        ("Audit*", audit.slug),
        ("Title", "AssessmentTemplate Title"),
        ("Default Assessment Type*", "Control"),
        ("Default Assignees*", "Auditors"),
        ("SOX 302 assessment workflow", imported_value),
    ])

    self._login()
    response = self.import_data(asmt_tmpl_data)

    self._check_csv_response(response, {})
    self._assert_sox_302_enabled_flag(
        tmpl_q.one(),
        exp_value,
    )

  @ddt.data(
      {"init_value": True, "imported_value": "yes", "exp_value": True},
      {"init_value": True, "imported_value": "no", "exp_value": False},
      {"init_value": True, "imported_value": "", "exp_value": True},
      {"init_value": False, "imported_value": "yes", "exp_value": True},
      {"init_value": False, "imported_value": "no", "exp_value": False},
      {"init_value": False, "imported_value": "", "exp_value": False},
  )
  @ddt.unpack
  def test_sox_302_tmpl_update(self, init_value, imported_value, exp_value):
    """Test SOX302 enabled={exp_value} when update asmt tmpl via import."""
    tmpl = ggrc_factories.AssessmentTemplateFactory(
        sox_302_enabled=init_value)
    tmpl_q = self._get_query_to_refresh(tmpl)

    asmt_tmpl_data = collections.OrderedDict([
        ("object_type", "Assessment Template"),
        ("Code*", tmpl.slug),
        ("SOX 302 assessment workflow", imported_value),
    ])

    self._login()
    response = self.import_data(asmt_tmpl_data)

    self._check_csv_response(response, {})
    self._assert_sox_302_enabled_flag(
        tmpl_q.one(),
        exp_value,
    )


@ddt.ddt
class TestExportWithSOX302(query_helper.WithQueryApi,
                           BaseTestWithSOX302):
  """Test export of of `WithSOX302Flow` objects."""

  def _assert_sox_302_enabled_flag_expored(self, exported_data, obj_name,
                                           expected_value):
    # type: (dict, str, str) -> None
    # pylint: disable=invalid-name
    """Assert that `sox_302_enabled` has expected value in exported data.

    For this assertion to pass, following conditions should be met:
      - Given object name should be present in exported data;
      - There should be only one object of provided type in exported data.
      - Value of "SOX 302 assessment workflow" in exported data should match
        with passed `expected_value`.

    Args:
      exported_data (dict): Dict representing exported object. Keys are field
        names as they should be named in resulting .CSV file.
      obj_name (str): Capitalized human readable object name.
      expected_value (str): Expected value of "SOX 302 assessment workflow"
        column in exported data.
    """
    self.assertIn(obj_name, exported_data)
    self.assertEqual(1, len(exported_data[obj_name]))
    exported_obj_data = exported_data[obj_name][0]
    self.assertEqual(
        exported_obj_data["SOX 302 assessment workflow"],
        expected_value,
    )

  @ddt.data(
      {"obj_value": True, "exp_value": "yes"},
      {"obj_value": False, "exp_value": "no"},
  )
  @ddt.unpack
  def test_sox_302_tmpl_export(self, obj_value, exp_value):
    """Test `SOX 302 assessment workflow` is exported correctly for tmpl."""
    tmpl = ggrc_factories.AssessmentTemplateFactory(sox_302_enabled=obj_value)
    tmpl_id = tmpl.id

    self._login()
    exported_data = self.export_parsed_csv([
        self._make_query_dict(
            "AssessmentTemplate",
            expression=["id", "=", tmpl_id],
        )
    ])

    self._assert_sox_302_enabled_flag_expored(
        exported_data,
        "Assessment Template",
        exp_value,
    )


@ddt.ddt
class TestApiWithSOX302(BaseTestWithSOX302):
  """Test REST API functonality of `WithSOX302Flow` objects."""

  def setUp(self):
    """Set up for SOX 302 REST API test case."""
    super(TestApiWithSOX302, self).setUp()
    self.api = api_helper.Api()

  @ddt.data(
      {"sent_value": True, "exp_value": True},
      {"sent_value": False, "exp_value": False},
  )
  @ddt.unpack
  def test_sox_302_tmpl_create(self, sent_value, exp_value):
    """Test SOX302 enabled={exp_value} when create asmt tmpl via API."""
    audit = ggrc_factories.AuditFactory()
    tmpl_q = self._get_query_by_audit_for(
        obj_type=all_models.AssessmentTemplate,
        audit=audit,
    )

    response = self.api.post(
        all_models.AssessmentTemplate,
        {
            "assessment_template": {
                "audit": {"id": audit.id},
                "context": {"id": audit.context.id},
                "default_people": {
                    "assignees": "Admin",
                    "verifiers": "Admin",
                },
                "title": "AssessmentTemplate Title",
                "sox_302_enabled": sent_value,
            },
        },
    )

    self.assert201(response)
    self._assert_sox_302_enabled_flag(
        tmpl_q.one(),
        exp_value,
    )

  @ddt.data(
      {"init_value": True, "sent_value": True, "exp_value": True},
      {"init_value": True, "sent_value": False, "exp_value": False},
      {"init_value": False, "sent_value": True, "exp_value": True},
      {"init_value": False, "sent_value": False, "exp_value": False},
  )
  @ddt.unpack
  def test_sox_302_tmpl_update(self, init_value, sent_value, exp_value):
    """Test SOX302 enabled={exp_value} when update asmt tmpl via API."""
    tmpl = ggrc_factories.AssessmentTemplateFactory(
        sox_302_enabled=init_value)
    tmpl_q = self._get_query_to_refresh(tmpl)

    response = self.api.put(
        tmpl,
        {
            "sox_302_enabled": sent_value,
        },
    )

    self.assert200(response)
    self._assert_sox_302_enabled_flag(
        tmpl_q.one(),
        exp_value,
    )

  @ddt.data(
      {"orig_value": True, "exp_value": True},
      {"orig_value": False, "exp_value": False},
  )
  @ddt.unpack
  def test_sox_302_tmpl_clone(self, orig_value, exp_value):
    """Test AssessmentTemplate SOX 302 enabled={0} when clone via API."""
    tmpl = ggrc_factories.AssessmentTemplateFactory(
        sox_302_enabled=orig_value)
    tmpl_clone_q = self._get_query_by_audit_for(
        all_models.AssessmentTemplate,
        tmpl.audit,
    ).filter(
        all_models.AssessmentTemplate.id != tmpl.id,
    )

    response = self.api.send_request(
        self.api.client.post,
        api_link="/api/assessment_template/clone",
        data=[{
            "sourceObjectIds": [tmpl.id],
            "destination": {
                "type": "Audit",
                "id": tmpl.audit.id,
            },
            "mappedObjects": []
        }],
    )

    self.assert200(response)
    self._assert_sox_302_enabled_flag(
        tmpl_clone_q.one(),
        exp_value,
    )
