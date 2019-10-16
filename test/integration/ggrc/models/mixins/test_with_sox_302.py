# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

# pylint: disable=protected-access

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
  def _get_query_to_refresh(*objs):
    # type: (Tuple[db.Model]) -> sqlalchemy.Query
    """Build sqlalchemy query for the given object to use it later.

    Build sqlalchemy query for the given objects. This helper method allows to
    build DB query when object IDs are known and they aren't detached from a
    session yet and use this query later when object might become detached from
    a session to refresh it.

    Args:
        objs (Tuple[db.Model]): Instances of db.Model class represeting object
          to query from DB.

    Returns:
      Sqlalchemy.Query object which could be used for later queries.
    """
    if not objs:
      return None

    model = objs[0].__class__
    return model.query.filter(model.id.in_(o.id for o in objs))

  @staticmethod
  def _get_asmt_tmpl_lcas(assessment_template):
    # type: (model.AssessmentTemplate) -> List[model.CustomAttributeDefinition]
    """Return list of local CADs of AssessmentTemplate.

    Return list of local CustomAttributeDefinition instances related to the
    given AssessmentTemplate.

    Args:
      assessment_template (model.AssessmentTemplate): Assessment template whose
        local custom attributes should be queried from DB.

    Returns:
      List of CustomAttributeDefinition instances.
    """
    cad = all_models.CustomAttributeDefinition
    return cad.query.filter(
        cad.definition_type == assessment_template._inflector.table_singular,
        cad.definition_id == assessment_template.id,
    ).all()

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

  def _assert_negative_options(self, cads, expected_cad_count,
                               expected_options, expected_negatives):
    # type: (List[model.CustomAttributeDefinition], int, list, list) -> None
    """Assert that provided CADs have correct negative options.

    For this assertion to pass, following conditions should be met:
      - Number of CADs should match with `expected_cad_count`;
      - Options of each CAD should match with options from `expected_options`;
      - Options from `expected_negatives` should be negative ones on CAD;

    Args:
      cads (List[model.CustomAttributeDefinition]): List of CADs whoose options
        should be checked.
      expected_cad_count (int): Expected number of CADs.
      expected_options (List[str]): List of expected options for each CAD.
      expected_negatives (List[str]): List of expected negative options for
        each CAD.
    """
    self.assertEqual(expected_cad_count, len(cads))
    for item in zip(cads, expected_options, expected_negatives):
      lca, exp_options, exp_negatives = item
      self.assertEqual(exp_options, lca.multi_choice_options)
      self.assertIn(exp_negatives, lca.negative_options)


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

  @ddt.data(
      {"imported_value": "yes", "exp_value": False},
      {"imported_value": "no", "exp_value": False},
      {"imported_value": "", "exp_value": False},
  )
  @ddt.unpack
  def test_sox_302_immut_asmt_create(self, imported_value, exp_value):
    """Test SOX 302 enabled is immutable when create asmt via import.

    SOX 302 enabled flag is read only on Assessment and could not be set via
    import directly. Only if assessment template is provided in imported data.
    This test check Assessment creation without AssessmentTemplate provided.
    """
    audit = ggrc_factories.AuditFactory()
    asmt_q = self._get_query_by_audit_for(
        obj_type=all_models.Assessment,
        audit=audit,
    )

    asmt_data = collections.OrderedDict([
        ("object_type", "Assessment"),
        ("Code*", ""),
        ("Template", ""),
        ("Audit*", audit.slug),
        ("Title", "Assessment Title"),
        ("Assignees", "user@example.com"),
        ("Creators", "user@example.com"),
        ("SOX 302 assessment workflow", imported_value),
    ])

    self._login()
    response = self.import_data(asmt_data)

    self._check_csv_response(response, {})
    self._assert_sox_302_enabled_flag(
        asmt_q.one(),
        exp_value,
    )

  @ddt.data(
      {"tmpl_value": True, "imported_value": "yes", "exp_value": True},
      {"tmpl_value": True, "imported_value": "no", "exp_value": True},
      {"tmpl_value": True, "imported_value": "", "exp_value": True},
      {"tmpl_value": False, "imported_value": "yes", "exp_value": False},
      {"tmpl_value": False, "imported_value": "no", "exp_value": False},
      {"tmpl_value": False, "imported_value": "", "exp_value": False},
  )
  @ddt.unpack
  def test_sox_302_asmt_with_tmpl_create(self, tmpl_value, imported_value,
                                         exp_value):
    # pylint: disable=invalid-name
    """Test SOX 302 enabled is mutable when create asmt with tmpl via import.

    SOX 302 enabled flag is read only on Assessment and could not be set via
    import directly. Only if assessment template is provided in imported data.
    This test check Assessment creation with AssessmentTemplate provided.
    """
    with ggrc_factories.single_commit():
      audit = ggrc_factories.AuditFactory()
      tmpl = ggrc_factories.AssessmentTemplateFactory(
          audit=audit,
          sox_302_enabled=tmpl_value,
      )
    asmt_q = self._get_query_by_audit_for(
        obj_type=all_models.Assessment,
        audit=audit,
    )

    asmt_data = collections.OrderedDict([
        ("object_type", "Assessment"),
        ("Code*", ""),
        ("Template", tmpl.slug),
        ("Audit*", audit.slug),
        ("Title", "Assessment Title"),
        ("Assignees", "user@example.com"),
        ("Creators", "user@example.com"),
        ("SOX 302 assessment workflow", imported_value),
    ])

    self._login()
    response = self.import_data(asmt_data)

    self._check_csv_response(response, {})
    self._assert_sox_302_enabled_flag(
        asmt_q.one(),
        exp_value,
    )

  @ddt.data(
      {"init_value": True, "imported_value": "yes", "exp_value": True},
      {"init_value": True, "imported_value": "no", "exp_value": True},
      {"init_value": True, "imported_value": "", "exp_value": True},
      {"init_value": False, "imported_value": "yes", "exp_value": False},
      {"init_value": False, "imported_value": "no", "exp_value": False},
      {"init_value": False, "imported_value": "", "exp_value": False},
  )
  @ddt.unpack
  def test_sox_302_immut_asmt_upd(self, init_value, imported_value, exp_value):
    """Test SOX 302 enabled is immutable when update asmt via import.

    SOX 302 enabled flag is read only on Assessment and could not be set via
    import directly. Only if assessment template is provided in imported data.
    This test check Assessment update case without AssessmentTemplate provided.
    """
    asmt = ggrc_factories.AssessmentFactory(sox_302_enabled=init_value)
    asmt_q = self._get_query_to_refresh(asmt)

    asmt_data = collections.OrderedDict([
        ("object_type", "Assessment"),
        ("Code*", asmt.slug),
        ("SOX 302 assessment workflow", imported_value),
    ])

    self._login()
    response = self.import_data(asmt_data)

    self._check_csv_response(response, {})
    self._assert_sox_302_enabled_flag(
        asmt_q.one(),
        exp_value,
    )

  @ddt.data(
      {"init_value": True, "tmpl_value": True, "exp_value": True},
      {"init_value": True, "tmpl_value": False, "exp_value": True},
      {"init_value": False, "tmpl_value": True, "exp_value": False},
      {"init_value": False, "tmpl_value": False, "exp_value": False},
  )
  @ddt.unpack
  def test_sox_302_asmt_with_tmpl_upd(self, init_value, tmpl_value, exp_value):
    """Test SOX 302 enabled is immutable when update asmt with tmpl via import.

    SOX 302 enabled flag is read only on Assessment and could not be set via
    import directly. Only if assessment template is provided in imported data.
    This test check Assessment update case with AssessmentTemplate provided.
    """
    with ggrc_factories.single_commit():
      asmt = ggrc_factories.AssessmentFactory(sox_302_enabled=init_value)
      tmpl = ggrc_factories.AssessmentTemplateFactory(
          audit=asmt.audit,
          sox_302_enabled=tmpl_value,
      )
    asmt_q = self._get_query_to_refresh(asmt)

    asmt_data = collections.OrderedDict([
        ("object_type", "Assessment"),
        ("Code*", asmt.slug),
        ("Template", tmpl.slug),
    ])

    self._login()
    response = self.import_data(asmt_data)

    self._check_csv_response(response, {})
    self._assert_sox_302_enabled_flag(
        asmt_q.one(),
        exp_value,
    )

  @ddt.data(
      {
          "lca_to_import": "Dropdown, LCA with negative, yes, (n)no",
          "expected_options": ["yes,no"],
          "expected_negatives": ["no"],
          "expected_lca_count": 1,
      },
      {
          "lca_to_import": "Rich Text, LCA with negative, empty, (n)not empty",
          "expected_options": ["empty,not empty"],
          "expected_negatives": ["not empty"],
          "expected_lca_count": 1,
      },
      {
          "lca_to_import": "Text, LCA with negative, (n)empty, not empty",
          "expected_options": ["empty,not empty"],
          "expected_negatives": ["empty"],
          "expected_lca_count": 1,
      },
  )
  @ddt.unpack
  def test_negative_lca_create(self, lca_to_import, expected_options,
                               expected_negatives, expected_lca_count):
    """Test LCA with negative options is created when create tmpl via import.

    Test that local Custom Attribute with negative options is created when
    creating new Assessment Template via import.
    """
    audit = ggrc_factories.AuditFactory()
    tmpl_q = self._get_query_by_audit_for(
        obj_type=all_models.AssessmentTemplate,
        audit=audit,
    )

    asmt_tmpl_data = collections.OrderedDict([
        ("object_type", "Assessment Template"),
        ("Code*", ""),
        ("Audit*", audit.slug),
        ("Title*", "AssessmentTemplate Title"),
        ("Default Assessment Type*", "Control"),
        ("Default Assignees*", "Auditors"),
        ("Custom Attributes", lca_to_import),
    ])

    self._login()
    response = self.import_data(asmt_tmpl_data)

    self._check_csv_response(response, {})
    tmpl = tmpl_q.one()
    self._assert_negative_options(
        cads=self._get_asmt_tmpl_lcas(tmpl),
        expected_cad_count=expected_lca_count,
        expected_options=expected_options,
        expected_negatives=expected_negatives,
    )

  @ddt.data(
      {
          "lca_to_import": "Dropdown, LCA with negative, yes, (n)no",
          "expected_options": ["yes,no"],
          "expected_negatives": ["no"],
          "expected_lca_count": 1,
      },
      {
          "lca_to_import": "Rich Text, LCA with negative, empty, (n)not empty",
          "expected_options": ["empty,not empty"],
          "expected_negatives": ["not empty"],
          "expected_lca_count": 1,
      },
      {
          "lca_to_import": "Text, LCA with negative, (n)empty, not empty",
          "expected_options": ["empty,not empty"],
          "expected_negatives": ["empty"],
          "expected_lca_count": 1,
      },
  )
  @ddt.unpack
  def test_negative_lca_update(self, lca_to_import, expected_options,
                               expected_negatives, expected_lca_count):
    """Test LCA with negative options is created when update via import.

    Check that local Custom Attribute with negative options is created and all
    previous attached local Custom Attributes are deleted when updating
    Assessment Template via import.
    """
    with ggrc_factories.single_commit():
      tmpl = ggrc_factories.AssessmentTemplateFactory()
      lca_1 = ggrc_factories.CustomAttributeDefinitionFactory(
          title="Dropdown LCA with no negatives to be deleted",
          definition_type=tmpl._inflector.table_singular,
          definition_id=tmpl.id,
          attribute_type="Dropdown",
          multi_choice_options="yes,no",
          multi_choice_mandatory="0,0",
      )
      lca_2 = ggrc_factories.CustomAttributeDefinitionFactory(
          title="Rich Text LCA with negatives to be deleted",
          definition_type=tmpl._inflector.table_singular,
          definition_id=tmpl.id,
          attribute_type="Rich Text",
          multi_choice_options="empty,not empty",
          multi_choice_mandatory="0,8",
      )
      lca_3 = ggrc_factories.CustomAttributeDefinitionFactory(
          title="Text LCA with negatives to be deleted",
          definition_type=tmpl._inflector.table_singular,
          definition_id=tmpl.id,
          attribute_type="Text",
          multi_choice_options="empty,not empty",
          multi_choice_mandatory="8,0",
      )
    tmpl_q = self._get_query_to_refresh(tmpl)
    old_cads_q = self._get_query_to_refresh(lca_1, lca_2, lca_3)
    asmt_tmpl_data = collections.OrderedDict([
        ("object_type", "Assessment Template"),
        ("Code*", tmpl.slug),
        ("Custom Attributes", lca_to_import),
    ])

    self._login()
    response = self.import_data(asmt_tmpl_data)

    self._check_csv_response(response, {})
    tmpl = tmpl_q.one()
    self.assertEqual(old_cads_q.all(), [])
    self._assert_negative_options(
        cads=self._get_asmt_tmpl_lcas(tmpl),
        expected_cad_count=expected_lca_count,
        expected_options=expected_options,
        expected_negatives=expected_negatives,
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

  @ddt.data(
      {"obj_value": True, "exp_value": "yes"},
      {"obj_value": False, "exp_value": "no"},
  )
  @ddt.unpack
  def test_sox_302_asmt_export(self, obj_value, exp_value):
    """Test `SOX 302 assessment workflow` is exported correctly for asmt."""
    asmt = ggrc_factories.AssessmentFactory(sox_302_enabled=obj_value)
    asmt_id = asmt.id

    self._login()
    exported_data = self.export_parsed_csv([
        self._make_query_dict(
            "Assessment",
            expression=["id", "=", asmt_id],
        )
    ])

    self._assert_sox_302_enabled_flag_expored(
        exported_data,
        "Assessment",
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

  @ddt.data(
      {"sent_value": True, "exp_value": False},
      {"sent_value": False, "exp_value": False},
  )
  @ddt.unpack
  def test_sox_302_immut_asmt_create(self, sent_value, exp_value):
    """Test SOX 302 enabled is immutable when create asmt via API.

    SOX 302 enabled flag is read only on Assessment and could not be set via
    REST API directly. Only if assessment template is provided in request data.
    This test check Assessment creation without AssessmentTemplate provided.
    """
    audit = ggrc_factories.AuditFactory()
    asmt_q = self._get_query_by_audit_for(
        obj_type=all_models.Assessment,
        audit=audit,
    )

    response = self.api.post(
        all_models.Assessment,
        {
            "assessment": {
                "audit": {"id": audit.id},
                "title": "Assessment Title",
                "sox_302_enabled": sent_value,
            },
        },
    )

    self.assert201(response)
    self._assert_sox_302_enabled_flag(
        asmt_q.one(),
        exp_value,
    )

  @ddt.data(
      {"tmpl_value": True, "sent_value": True, "exp_value": True},
      {"tmpl_value": False, "sent_value": True, "exp_value": False},
      {"tmpl_value": True, "sent_value": False, "exp_value": True},
      {"tmpl_value": False, "sent_value": False, "exp_value": False},
  )
  @ddt.unpack
  def test_sox_302_asmt_with_tmpl_create(self, tmpl_value, sent_value,
                                         exp_value):
    # pylint: disable=invalid-name
    """Test SOX 302 enabled is mutable when create asmt with tmpl via API.

    SOX 302 enabled flag is read only on Assessment and could not be set via
    REST API directly. Only if assessment template is provided in request data.
    This test check Assessment creation with AssessmentTemplate provided.
    """
    with ggrc_factories.single_commit():
      audit = ggrc_factories.AuditFactory()
      asmt_tmpl = ggrc_factories.AssessmentTemplateFactory(
          audit=audit,
          sox_302_enabled=tmpl_value,
      )
    asmt_q = self._get_query_by_audit_for(
        obj_type=all_models.Assessment,
        audit=audit,
    )

    response = self.api.post(
        all_models.Assessment,
        {
            "assessment": {
                "audit": {"id": audit.id},
                "template": {"id": asmt_tmpl.id},
                "title": "Assessment Title",
                "sox_302_enabled": sent_value,
            },
        },
    )

    self.assert201(response)
    self._assert_sox_302_enabled_flag(
        asmt_q.one(),
        exp_value,
    )

  @ddt.data(
      {"init_value": True, "sent_value": True, "exp_value": True},
      {"init_value": True, "sent_value": False, "exp_value": True},
      {"init_value": False, "sent_value": True, "exp_value": False},
      {"init_value": False, "sent_value": False, "exp_value": False},
  )
  @ddt.unpack
  def test_sox_302_immut_asmt_upd(self, init_value, sent_value, exp_value):
    """Test SOX 302 enabled is immutable when update asmt via API.

    SOX 302 enabled flag is read only on Assessment and could not be set via
    REST API directly. Only if assessment template is provided in request data.
    This test check Assessment update without AssessmentTemplate provided.
    """
    asmt = ggrc_factories.AssessmentFactory(sox_302_enabled=init_value)
    asmt_q = self._get_query_to_refresh(asmt)

    response = self.api.put(
        asmt,
        {
            "sox_302_enabled": sent_value,
        },
    )

    self.assert200(response)
    self._assert_sox_302_enabled_flag(
        asmt_q.one(),
        exp_value,
    )


@ddt.ddt
class TestQueriesWithSOX302(query_helper.WithQueryApi,
                            BaseTestWithSOX302):
  """Test query API filtering for `WithSOX302Flow` objects."""

  def setUp(self):
    super(TestQueriesWithSOX302, self).setUp()
    self.api = api_helper.Api()

  def _assert_right_obj_found(self, query_result, expected_obj_type,
                              expected_obj_id):
    # type: (dict, str, int) -> None
    """Assert that only expected object was found by query API.

    For this assertion to pass, following conditions should be met:
      - Given query result should contain only one object;
      - ID of object in the query result should match with the given expected
        object ID.

    Args:
      query_result (dict): Dict representing result of query API request.
      expected_obj_type (str): Expected type of found object.
      expected_obj_id (int): Expected ID of found object.
    """
    response_asmt_tmpl = query_result[0][expected_obj_type]
    self.assertEqual(1, response_asmt_tmpl["count"])
    self.assertEqual(
        response_asmt_tmpl["values"][0]["id"],
        expected_obj_id,
    )

  @ddt.data(
      {"obj_value": True, "filter_by_value": "yes"},
      {"obj_value": False, "filter_by_value": "no"},
  )
  @ddt.unpack
  def test_sox_302_enabled_filter_tmpl(self, obj_value, filter_by_value):
    # pylint: disable=invalid-name
    """Test tmpl could be filtered by sox_302_enabled field."""
    with ggrc_factories.single_commit():
      tmpl = ggrc_factories.AssessmentTemplateFactory(
          sox_302_enabled=obj_value)
      ggrc_factories.AssessmentTemplateFactory(sox_302_enabled=(not obj_value))
    searched_tmpl_id = tmpl.id

    query_request_data = [
        self._make_query_dict(
            "AssessmentTemplate",
            expression=["sox_302_enabled", "=", filter_by_value],
        ),
    ]

    response = self.api.send_request(
        self.api.client.post, data=query_request_data, api_link="/query"
    )

    self.assert200(response)
    self._assert_right_obj_found(
        response.json,
        "AssessmentTemplate",
        searched_tmpl_id,
    )

  @ddt.data(
      {"obj_value": True, "filter_by_value": "yes"},
      {"obj_value": False, "filter_by_value": "no"},
  )
  @ddt.unpack
  def test_sox_302_enabled_filter(self, obj_value, filter_by_value):
    """Test asmt could be filtered by sox_302_enabled field."""
    with ggrc_factories.single_commit():
      asmt = ggrc_factories.AssessmentFactory(sox_302_enabled=obj_value)
      ggrc_factories.AssessmentFactory(sox_302_enabled=(not obj_value))
    searched_amst_id = asmt.id

    query_request_data = [
        self._make_query_dict(
            "Assessment",
            expression=["sox_302_enabled", "=", filter_by_value],
        ),
    ]

    response = self.api.send_request(
        self.api.client.post, data=query_request_data, api_link="/query"
    )

    self.assert200(response)
    self._assert_right_obj_found(
        response.json,
        "Assessment",
        searched_amst_id,
    )
