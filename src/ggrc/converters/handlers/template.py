# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Handlers specific for Assessment templates."""

import re

from sqlalchemy import and_

from ggrc import db
from ggrc import converters
from ggrc.models import CustomAttributeDefinition as CAD
from ggrc.converters.handlers import handlers
from ggrc.converters import errors


class TemplateObjectColumnHandler(handlers.ColumnHandler):
  """Handler for template object type field."""

  def parse_item(self):
    """Parse object type field for assessment templates."""
    exportables = converters.get_exportables()
    object_type = exportables.get(self.raw_value.lower())
    if not object_type:
      self.add_error(errors.WRONG_VALUE_ERROR, column_name=self.display_name)
      return

    return object_type.__name__


class TemplateCaColumnHandler(handlers.ColumnHandler):

  """Handler for Template custom attributes column."""

  TYPE_MAP = {k.lower(): v for k, v in CAD.VALID_TYPES.iteritems()}

  @staticmethod
  def _get_ca_type(definition_str):
    """Get type and mandatory flag for custom attribute."""
    ca_type = definition_str.strip().lower()
    mandatory = False
    if ca_type.lower().startswith("mandatory "):
      mandatory = True
      ca_type = ca_type[10:].strip()
    return ca_type, mandatory

  @staticmethod
  def _get_multiple_choice(choices):
    """Get option and mandatory strings for a list of choices."""
    options = []
    mandatory = []
    for option in choices:
      man = 0
      if "(c)" in option.lower():
        man += 1
      if "(a)" in option.lower():
        man += 2
      if "(n)" in option.lower():
        man += 8
      options.append(re.sub(r"\([aAcCnN]\)", "", option).strip())
      mandatory.append(str(man))
    return ",".join(options), ",".join(mandatory)

  def _handle_ca_line(self, line):
    """Parse single custom attribute definition line."""
    parts = [part.strip() for part in line.split(",")]
    if len(parts) < 2:
      self.add_warning(errors.WRONG_VALUE, column_name=self.display_name)
      return None
    ca_type, mandatory = self._get_ca_type(parts[0])

    if ca_type not in self.TYPE_MAP:
      self.add_warning(errors.WRONG_VALUE, column_name=self.display_name)
      return None

    ca_title = parts[1]
    multi_options, multi_mandatory = self._get_multiple_choice(parts[2:])

    attribute = CAD()
    attribute.attribute_type = self.TYPE_MAP[ca_type]
    attribute.mandatory = mandatory
    attribute.title = ca_title
    attribute.definition_type = "assessment_template"
    attribute.multi_choice_options = multi_options
    attribute.multi_choice_mandatory = multi_mandatory
    return attribute

  def parse_item(self):
    """Parse a list of custom attributes."""
    lines = self.raw_value.splitlines()
    lines = [line for line in lines if line]
    custom_attributes = []
    for line in lines:
      attribute = self._handle_ca_line(line)
      if attribute:
        custom_attributes.append(attribute)
    return custom_attributes

  def set_obj_attr(self):
    pass

  def _remove_current_attrs(self):
    """Remove all template custom attributes stored in the db.

    This is used for clean up when updating existing assessment template.

    Note: this should be done with checking each attribute and modifying it if
    needed.
    """
    if self.row_converter.is_new or not self.row_converter.obj.id:
      return

    db.session.query(CAD).filter(and_(
        CAD.definition_type == "assessment_template",
        CAD.definition_id == self.row_converter.obj.id
    )).delete()
    db.session.flush()

  def insert_object(self):
    """Add custom attributes to db session."""
    if not self.value or self.row_converter.ignore:
      return

    self._remove_current_attrs()

    for attribute in self.value:
      attribute.definition_id = self.row_converter.obj.id
      db.session.add(attribute)
