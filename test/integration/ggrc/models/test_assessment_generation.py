# Copyright (C) 2018 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Integration tests for Assessment Generation"""

import collections
import ddt

from ggrc import db
from ggrc.access_control.role import get_custom_roles_for
from ggrc.models import all_models

from integration.ggrc.models import factories
from integration.ggrc.models.test_assessment_base import TestAssessmentBase


@ddt.ddt
class TestAssessmentGeneration(TestAssessmentBase):
  """Test assessment generation"""
  # pylint: disable=invalid-name,too-many-public-methods

  def setUp(self):
    super(TestAssessmentGeneration, self).setUp()
    with factories.single_commit():
      self.audit = factories.AuditFactory()
      self.control = factories.ControlFactory(test_plan="Control Test Plan")
      self.snapshot = self._create_snapshots(self.audit, [self.control])[0]

    self.auditor_role = all_models.AccessControlRole.query.filter_by(
        name="Auditors").first()
    self.captains_role = all_models.AccessControlRole.query.filter_by(
        name="Audit Captains").first()

  def assert_assignees(self, role, response, *users):
    """Check if Assignee people in response are same with passed users"""
    acls = response.json["assessment"]["access_control_list"]
    asmnt_roles = get_custom_roles_for("Assessment")
    acl_people = all_models.Person.query.filter(
        all_models.Person.id.in_([
            a.get("person", {}).get("id")
            for a in acls if asmnt_roles.get(a.get("ac_role_id")) == role
        ])
    )
    self.assertEqual(list(users), [p.email for p in acl_people])

  def generate_acls(self, users, role):
    """Helper method to generate audit acls for auditors/captains"""
    people = []
    for user in users:
      person = factories.PersonFactory(email=user)
      people += [person]

    for person in people:
      factories.AccessControlListFactory(
          ac_role=role,
          object=self.audit,
          person=person)

  def test_autogenerated_title(self):
    """Test autogenerated assessment title"""
    control_title = self.control.title
    audit_title = self.audit.title
    response = self.assessment_post()
    title = response.json["assessment"]["title"]
    self.assertIn(audit_title, title)
    self.assertIn(control_title, title)

  def test_autogenerated_assignees_verifiers(self):
    """Test autogenerated assessment assignees"""
    auditors = [
        "user1@example.com",
        "user2@example.com"]
    captains = [
        "user3@example.com",
        "user4@example.com",
        "user5@example.com"]
    with factories.single_commit():
      self.generate_acls(auditors, self.auditor_role)
      self.generate_acls(captains, self.captains_role)

    self.assertEqual(
        all_models.AccessControlList.query.filter_by(
            ac_role_id=self.auditor_role.id,
            object_id=self.audit.id,
            object_type="Audit").count(), 2, "Auditors not present")

    response = self.assessment_post()
    self.assert_assignees("Verifiers", response, *auditors)
    self.assert_assignees("Assignees", response, *captains)
    self.assert_assignees("Creators", response, "user@example.com")

  def test_mapped_roles_autogenerated(self):
    """Test mapped assignee roles for generated assessment"""
    auditors = [
        "user1@example.com",
        "user2@example.com"]
    captains = [
        "user3@example.com"
    ]
    with factories.single_commit():
      self.generate_acls(auditors, self.auditor_role)
      self.generate_acls(captains, self.captains_role)

    self.assessment_post()

    mapped_objects = [self.audit, self.snapshot]
    for obj in mapped_objects:
      self.assert_propagated_role("Verifiers", auditors[0], obj)
      self.assert_propagated_role("Verifiers", auditors[1], obj)
      self.assert_propagated_role("Assignees", captains[0], obj)
      self.assert_propagated_role("Creators", "user@example.com", obj)

  def test_template_test_plan(self):
    """Test if generating assessments from template sets default test plan"""
    template = factories.AssessmentTemplateFactory(
        test_plan_procedure=False,
        procedure_description="Assessment Template Test Plan"
    )
    response = self.assessment_post(template)
    self.assertEqual(response.json["assessment"]["test_plan"],
                     template.procedure_description)

  def test_mapped_roles_template(self):
    """Test mapped assignee roles for assessment generated from template """

    auditors = ["user1@example.com", "user2@example.com"]
    captains = ["user3@example.com", "user4@example.com"]
    with factories.single_commit():
      template = factories.AssessmentTemplateFactory()
      self.generate_acls(auditors, self.auditor_role)
      self.generate_acls(captains, self.captains_role)

    self.assessment_post(template)
    for obj in [self.audit, self.snapshot]:
      self.assert_propagated_role("Verifiers", "user1@example.com", obj)
      self.assert_propagated_role("Verifiers", "user2@example.com", obj)
      self.assert_propagated_role("Assignees", "user3@example.com", obj)
      self.assert_propagated_role("Assignees", "user4@example.com", obj)
      self.assert_propagated_role("Creators", "user@example.com", obj)

  def test_control_test_plan(self):
    """Test test_plan from control"""
    test_plan = self.control.test_plan
    template = factories.AssessmentTemplateFactory(
        test_plan_procedure=True
    )
    response = self.assessment_post(template)
    self.assertEqual(
        response.json["assessment"]["test_plan"],
        "<br>".join([template.procedure_description, test_plan])
    )

  def test_ca_order(self):
    """Test LCA/GCA order in Assessment"""
    template = factories.AssessmentTemplateFactory(
        test_plan_procedure=False,
        procedure_description="Assessment Template Test Plan"
    )

    custom_attribute_definitions = [
        # Global CAs
        {
            "definition_type": "assessment",
            "title": "rich_test_gca",
            "attribute_type": "Rich Text",
            "multi_choice_options": ""
        },
        {
            "definition_type": "assessment",
            "title": "checkbox1_gca",
            "attribute_type": "Checkbox",
            "multi_choice_options": "test checkbox label"
        },
        # Local CAs
        {
            "definition_type": "assessment_template",
            "definition_id": template.id,
            "title": "test text field",
            "attribute_type": "Text",
            "multi_choice_options": ""
        },
        {
            "definition_type": "assessment_template",
            "definition_id": template.id,
            "title": "test RTF",
            "attribute_type": "Rich Text",
            "multi_choice_options": ""
        },
        {
            "definition_type": "assessment_template",
            "definition_id": template.id,
            "title": "test checkbox",
            "attribute_type": "Checkbox",
            "multi_choice_options": "test checkbox label"
        },
    ]

    for attribute in custom_attribute_definitions:
      factories.CustomAttributeDefinitionFactory(**attribute)
    response = self.assessment_post(template)
    self.assertListEqual(
        [u'test text field', u'test RTF', u'test checkbox', u'rich_test_gca',
         u'checkbox1_gca'],
        [cad['title'] for cad in
         response.json["assessment"]["custom_attribute_definitions"]]
    )

  def test_autogenerated_assignees_verifiers_with_model(self):
    """Test autogenerated assessment assignees based on template settings."""
    assignee = "user1@example.com"
    verifier = "user2@example.com"
    with factories.single_commit():
      auditors = {u: factories.PersonFactory(email=u).id
                  for u in [assignee, verifier]}
      template = factories.AssessmentTemplateFactory(
          test_plan_procedure=False,
          procedure_description="Assessment Template Test Plan",
          default_people={
              "assignees": [auditors[assignee]],
              "verifiers": [auditors[verifier]],
          },
      )

    response = self.assessment_post(template)
    self.assert_assignees("Verifiers", response, verifier)
    self.assert_assignees("Assignees", response, assignee)
    self.assert_assignees("Creators", response, "user@example.com")

  @ddt.data(
      ("Principal Assignees", None, ),
      ("Principal Assignees", "Principal Assignees", ),
      ("Principal Assignees", "Secondary Assignees", ),
      ("Principal Assignees", "Primary Contacts", ),
      ("Principal Assignees", "Secondary Contacts", ),
      ("Principal Assignees", "Admin"),

      ("Secondary Assignees", None, ),
      ("Secondary Assignees", "Principal Assignees", ),
      ("Secondary Assignees", "Secondary Assignees", ),
      ("Secondary Assignees", "Primary Contacts", ),
      ("Secondary Assignees", "Secondary Contacts", ),
      ("Secondary Assignees", "Admin", ),

      ("Primary Contacts", None, ),
      ("Primary Contacts", "Principal Assignees", ),
      ("Primary Contacts", "Secondary Assignees", ),
      ("Primary Contacts", "Primary Contacts", ),
      ("Primary Contacts", "Secondary Contacts", ),
      ("Primary Contacts", "Admin", ),

      ("Secondary Contacts", None, ),
      ("Secondary Contacts", "Principal Assignees", ),
      ("Secondary Contacts", "Secondary Assignees", ),
      ("Secondary Contacts", "Primary Contacts", ),
      ("Secondary Contacts", "Secondary Contacts", ),
      ("Secondary Contacts", "Admin", ),

      ("Admin", None,),
      ("Admin", "Principal Assignees",),
      ("Admin", "Secondary Assignees",),
      ("Admin", "Primary Contacts",),
      ("Admin", "Secondary Contacts",),
      ("Admin", "Admin",),
  )
  @ddt.unpack
  def test_autogenerated_assignees_base_on_role(self,
                                                assessor_role,
                                                verifier_role):
    """Test autogenerated assessment assignees base on template settings."""
    assessor = "user1@example.com"
    verifier = "user2@example.com"
    auditors = collections.defaultdict(list)
    with factories.single_commit():
      self.audit.context = factories.ContextFactory()
      auditors[assessor_role].append(factories.PersonFactory(email=assessor))
      if verifier_role is not None:
        auditors[verifier_role].append(factories.PersonFactory(email=verifier))
      for role, people in auditors.iteritems():
        ac_role = all_models.AccessControlRole.query.filter_by(
            name=role,
            object_type=self.snapshot.child_type,
        ).first()
        if not ac_role:
          ac_role = factories.AccessControlRoleFactory(
              name=role,
              object_type=self.snapshot.child_type,
          )
        ac_role_id = ac_role.id
        for user in people:
          factories.AccessControlListFactory(
              person_id=user.id,
              object_id=self.snapshot.child_id,
              object_type=self.snapshot.child_type,
              ac_role_id=ac_role_id,
          )
      default_people = {"assignees": assessor_role}
      if verifier_role is not None:
        default_people["verifiers"] = verifier_role
      template = factories.AssessmentTemplateFactory(
          test_plan_procedure=False,
          procedure_description="Assessment Template Test Plan",
          default_people=default_people
      )
      self.snapshot.revision.content = self.control.log_json()
      db.session.add(self.snapshot.revision)
    response = self.assessment_post(template)
    if assessor_role == verifier_role:
      self.assert_assignees("Verifiers", response, assessor, verifier)
      self.assert_assignees("Assignees", response, assessor, verifier)
    elif verifier_role is None:
      self.assert_assignees("Verifiers", response)
      self.assert_assignees("Assignees", response, assessor)
    else:
      self.assert_assignees("Verifiers", response, verifier)
      self.assert_assignees("Assignees", response, assessor)
    self.assert_assignees("Creators", response, "user@example.com")

  @ddt.data(True, False)
  def test_autogenerated_audit_lead(self, add_verifier):
    """Test autogenerated assessment with audit lead settings."""
    email = "user_1@example.com"
    with factories.single_commit():
      default_people = {"assignees": "Audit Lead"}
      if add_verifier:
        default_people["verifiers"] = "Audit Lead"
      template = factories.AssessmentTemplateFactory(
          test_plan_procedure=False,
          procedure_description="Assessment Template Test Plan",
          default_people=default_people
      )
      self.generate_acls([email], self.captains_role)
    response = self.assessment_post(template)
    self.assert_assignees("Assignees", response, email)
    if add_verifier:
      self.assert_assignees("Verifiers", response, email)
    else:
      self.assert_assignees("Verifiers", response)
    self.assert_assignees("Creators", response, "user@example.com")

  @ddt.data(True, False)
  def test_autogenerated_auditors(self, add_verifier):
    """Test autogenerated assessment with auditor settings."""
    users = ["user1@example.com", "user2@example.com"]
    with factories.single_commit():
      self.generate_acls(users, self.auditor_role)
      default_people = {"assignees": "Auditors"}
      if add_verifier:
        default_people["verifiers"] = "Auditors"
      template = factories.AssessmentTemplateFactory(
          test_plan_procedure=False,
          procedure_description="Assessment Template Test Plan",
          default_people=default_people
      )
    response = self.assessment_post(template)
    self.assert_assignees("Assignees", response, *users)
    if add_verifier:
      self.assert_assignees("Verifiers", response, *users)
    else:
      self.assert_assignees("Verifiers", response)
    self.assert_assignees("Creators", response, "user@example.com")

  def test_autogenerated_no_tmpl(self):
    """Test autogenerated assessment without template ."""
    auditors = ["user1@example.com", "user2@example.com"]
    prince_assignees = ["user3@example.com", "user4@example.com"]
    with factories.single_commit():
      self.generate_acls(auditors, self.auditor_role)

      ac_role_id = all_models.AccessControlRole.query.filter_by(
          name="Principal Assignees",
          object_type=self.snapshot.child_type,
      ).first().id
      users = [factories.PersonFactory(email=e) for e in prince_assignees]
      for user in users:
        factories.AccessControlListFactory(
            person=user,
            object_id=self.snapshot.child_id,
            object_type=self.snapshot.child_type,
            ac_role_id=ac_role_id,
        )
      self.snapshot.revision.content = self.control.log_json()
      db.session.add(self.snapshot.revision)
    response = self.assessment_post()
    self.assert_assignees("Assignees", response, *prince_assignees)
    self.assert_assignees("Verifiers", response, *auditors)
    self.assert_assignees("Creators", response, "user@example.com")

  @ddt.data(
      ("Principal Assignees", None, ),
      ("Principal Assignees", "Principal Assignees", ),
      ("Principal Assignees", "Secondary Assignees", ),
      ("Principal Assignees", "Primary Contacts", ),
      ("Principal Assignees", "Secondary Contacts", ),

      ("Secondary Assignees", None, ),
      ("Secondary Assignees", "Principal Assignees", ),
      ("Secondary Assignees", "Secondary Assignees", ),
      ("Secondary Assignees", "Primary Contacts", ),
      ("Secondary Assignees", "Secondary Contacts", ),

      ("Primary Contacts", None, ),
      ("Primary Contacts", "Principal Assignees", ),
      ("Primary Contacts", "Secondary Assignees", ),
      ("Primary Contacts", "Primary Contacts", ),
      ("Primary Contacts", "Secondary Contacts", ),

      ("Secondary Contacts", None, ),
      ("Secondary Contacts", "Principal Assignees", ),
      ("Secondary Contacts", "Secondary Assignees", ),
      ("Secondary Contacts", "Primary Contacts", ),
      ("Secondary Contacts", "Secondary Contacts", ),
  )
  @ddt.unpack
  def test_autogenerated_assignees_base_on_audit(self,
                                                 assessor_role,
                                                 verifier_role):
    """Test autogenerated assessment assignees base on audit setting

    and empty tmpl."""
    assessor_audit = "auditor@example.com"
    verifier_audit = "verifier@example.com"
    with factories.single_commit():
      default_people = {"assignees": assessor_role}
      if verifier_role is not None:
        default_people["verifiers"] = verifier_role
      self.generate_acls([assessor_audit], self.captains_role)
      self.generate_acls([verifier_audit], self.auditor_role)
      self.snapshot.revision.content = self.control.log_json()
      db.session.add(self.snapshot.revision)
      template = factories.AssessmentTemplateFactory(
          test_plan_procedure=False,
          procedure_description="Assessment Template Test Plan",
          default_people=default_people
      )
    response = self.assessment_post(template)
    self.assert_assignees("Assignees", response, assessor_audit)
    if verifier_role:
      self.assert_assignees("Verifiers", response, verifier_audit)
    else:
      self.assert_assignees("Verifiers", response)
    self.assert_assignees("Creators", response, "user@example.com")

  @ddt.data(
      ("principal_assessor", "Principal Assignees"),
      ("secondary_assessor", "Secondary Assignees"),
      ("contact", "Primary Contacts"),
      ("secondary_contact", "Secondary Contacts"),
  )
  @ddt.unpack
  def test_autogenerated_no_acl_in_snapshot(self, field, role_name):
    """Test autogenerated assessment assignees base on template settings

    and no ACL list in snapshot."""
    email = "{}@example.com".format(field)
    with factories.single_commit():
      person = factories.PersonFactory(email=email, name=field)
      template = factories.AssessmentTemplateFactory(
          test_plan_procedure=False,
          procedure_description="Assessment Template Test Plan",
          default_people={"assignees": role_name}
      )
      content = self.control.log_json()
      content.pop("access_control_list")
      content[field] = {"id": person.id}
      self.snapshot.revision.content = content
      db.session.add(self.snapshot.revision)
    response = self.assessment_post(template)
    self.assert_assignees("Assignees", response, email)

  @ddt.data(1, 2, 3, 4)
  def test_remap_doc_from_assessment(self, test_asmt_num):
    """Test mappings saving for assessment"""
    urls = ["url1", "url2"]
    evidences = ["https://d.google.com/drawings/d/666/edit",
                 "https://d.google.com/drawings/d/555/edit"]

    with factories.single_commit():
      asmts = {i: factories.AssessmentFactory() for i in range(1, 4)}

    url_str = "\n".join(urls)
    evidences_str = "\n".join(evidences)
    import_data, update_data = [], []
    for num, asmt in asmts.items():
      import_data.append(collections.OrderedDict([
          ("object_type", "Assessment"),
          ("Code", asmt.slug),
          ("Evidence Url", url_str),
          ("Evidence File", evidences_str),
      ]))
      update_data.append(collections.OrderedDict([
          ("object_type", "Assessment"),
          ("Code", asmt.slug),
          ("Evidence Url", "" if num == test_asmt_num else url_str),
          ("Evidence File", "" if num == test_asmt_num else evidences_str),
      ]))

    res = self.import_data(*import_data)
    self._check_csv_response(res, {})
    res = self.import_data(*update_data)
    self._check_csv_response(res, {})

    for num, asmt in asmts.items():
      asmt = all_models.Assessment.query.get(asmt.id)
      if num == test_asmt_num:
        self.assertFalse(asmt.evidences_url)
        self.assertFalse(asmt.evidences_file)
      else:
        self.assertEqual([url.link for url in asmt.evidences_url], urls)
        self.assertEqual([ev.link for ev in asmt.evidences_file], evidences)

  @ddt.data(
      (None, "Control", "Control"),
      (None, "Objective", "Objective"),
      (None, None, "Control"),
      ("Market", "Objective", "Market"),
      ("Objective", "Control", "Objective"),
      ("Objective", "Objective", "Objective"),
      ("Objective", None, "Objective"),
      ("Invalid Type", "Invalid Type", None),
      (None, "Invalid Type", None),
      ("Invalid Type", None, None),
  )
  @ddt.unpack
  def test_generated_assessment_type(self, templ_type, obj_type, exp_type):
    """Test assessment type for generated assessments"""
    template = None
    if templ_type:
      template = factories.AssessmentTemplateFactory(
          template_object_type=templ_type
      )
    assessment_type = None
    if obj_type:
      assessment_type = {"assessment_type": obj_type}

    response = self.assessment_post(
        template=template,
        extra_data=assessment_type
    )
    if exp_type:
      self.assertEqual(response.status_code, 200)
      assessment = all_models.Assessment.query.first()
      self.assertEqual(assessment.assessment_type, exp_type)
    else:
      self.assertEqual(response.status_code, 400)

  def test_changing_text_fields_should_not_change_status(self):
    """Test Assessment does not change status if 'design', 'operationally',
    'notes' posted as empty strings
    """
    test_state = "START_STATE"
    response = self.assessment_post()
    self.assertEqual(response.status_code, 200)
    asmt = all_models.Assessment.query.one()
    self.assertEqual(asmt.status,
                     getattr(all_models.Assessment, test_state))
    response = self.assessment_post(
        extra_data={
            "id": asmt.id,
            "design": "",
            "operationally": "",
            "notes": ""
        }
    )
    self.assertEqual(response.status_code, 200)
    assessment = self.refresh_object(asmt)
    self.assertEqual(assessment.status,
                     getattr(all_models.Assessment, test_state))

  def test_generated_test_plan(self):
    """Check if generated Assessment inherit test plan of Snapshot"""
    test_plan = self.control.test_plan
    response = self.assessment_post()
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.json["assessment"]["test_plan"], test_plan)

  def test_generate_empty_auditor(self):
    """Test generation in audit without Auditor from template with Auditor."""
    with factories.single_commit():
      person = factories.PersonFactory()
      captain_acl_id = factories.AccessControlListFactory(
          object=self.audit, person=person, ac_role=self.captains_role
      ).id
      template = factories.AssessmentTemplateFactory(
          default_people={"assignees": "Auditors", "verifiers": "Auditors"}
      )
    response = self.assessment_post(template)
    self.assert_assignees("Creators", response, "user@example.com")
    captain_acl = all_models.AccessControlList.query.get(captain_acl_id)
    # If Auditor is not set, Audit Captain should be used as Assignee
    self.assert_assignees("Assignees", response, captain_acl.person.email)
    self.assert_assignees("Verifiers", response, captain_acl.person.email)
