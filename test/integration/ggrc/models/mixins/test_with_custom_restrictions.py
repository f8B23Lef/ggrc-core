# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Integration test for With Custom Restrictions mixin"""

import ddt

from flask import g

from ggrc.models import all_models

from integration.ggrc import TestCase
from integration.ggrc.models import factories


# pylint: disable=invalid-name
@ddt.ddt
class TestWithCustomRestrictions(TestCase):
  """Test cases for With Custom Restrictions mixin"""

  @staticmethod
  def assign_person(object_, acr, person_id):
    """Assign person to object."""
    # pylint: disable=protected-access
    for ac_list in object_._access_control_list:
      if ac_list.ac_role.name == acr.name and acr.object_type == object_.type:
        factories.AccessControlPersonFactory(
            person_id=person_id,
            ac_list=ac_list,
        )

  @staticmethod
  def set_current_person(user):
    """Set user as current for Flask app"""
    setattr(g, '_current_user', user)

  @ddt.data(
      ('Assignees', True),
      ('Creators', False),
      ('Verifiers', False),
      ("Primary Contacts", False),
      ("Secondary Contacts", False)
  )
  @ddt.unpack
  def test_assignee_has_restricted_access(self, role_name, restricted_access):
    # pylint: disable=protected-access
    """Test Assignee role restricted access to fields for Assessment
    with sox302"""
    assmnt = factories.AssessmentFactory(sox_302_enabled=True)
    person = factories.PersonFactory()
    acr_assmnt = all_models.AccessControlRole.query.filter_by(
        name=role_name,
        object_type="Assessment",
    ).first()
    self.assign_person(assmnt, acr_assmnt, person.id)
    user = next(self.get_persons_for_role_name(assmnt, role_name))
    self.set_current_person(user)
    self.assertEqual(assmnt._is_sox_restricted(), restricted_access)

  @ddt.data("Audit Captains", "Auditors")
  def test_propagated_audit_roles(self, audit_role):
    """Test user sox302 permissions for Assessment with roles in Audit
    and Assessment"""
    user = factories.PersonFactory()
    acr_audit = all_models.AccessControlRole.query.filter_by(
        name=audit_role,
        object_type="Audit",
    ).first()
    acr_assmnt = all_models.AccessControlRole.query.filter_by(
        name="Assignees",
        object_type="Assessment",
    ).first()

    program = factories.ProgramFactory()

    audit = factories.AuditFactory(program=program)
    factories.RelationshipFactory(
        source=audit,
        destination=program,
    )
    self.assign_person(audit, acr_audit, user.id)

    assessment = factories.AssessmentFactory(audit=audit, sox_302_enabled=True)
    self.assign_person(assessment, acr_assmnt, user.id)
    factories.RelationshipFactory(
        source=audit, destination=assessment
    )

    self.assertFalse(assessment.is_user_role_restricted(user))

  @ddt.data("Program Managers", "Program Editors")
  def test_propagated_program_roles(self, program_role):
    """Test user sox302 permissions for Assessment with roles in Program
    and Assessment"""
    user = factories.PersonFactory()
    acr_program = all_models.AccessControlRole.query.filter_by(
        name=program_role,
        object_type="Program",
    ).first()
    acr_assmnt = all_models.AccessControlRole.query.filter_by(
        name="Assignees",
        object_type="Assessment",
    ).first()

    program = factories.ProgramFactory()
    self.assign_person(program, acr_program, user.id)

    audit = factories.AuditFactory(program=program)
    factories.RelationshipFactory(
        source=audit,
        destination=program,
    )

    assessment = factories.AssessmentFactory(audit=audit, sox_302_enabled=True)
    self.assign_person(assessment, acr_assmnt, user.id)
    factories.RelationshipFactory(
        source=audit, destination=assessment
    )

    self.assertFalse(assessment.is_user_role_restricted(user))
