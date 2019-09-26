# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""Contains `WithSOX302` mixin."""

from sqlalchemy import orm as sa_orm
from sqlalchemy.ext import declarative as sa_declarative

from ggrc import db
from ggrc.fulltext import attributes
from ggrc.models import reflection


class WithSOX302Flow(object):  # pylint: disable=too-few-public-methods
  """Mixin which adds a support of SOX 302 flow."""

  @sa_declarative.declared_attr
  def sox_302_enabled(cls):  # pylint: disable=no-self-argument,no-self-use
    """Flag defining if SOX 302 flow is activated for object."""
    return db.Column(db.Boolean, nullable=False, default=False)

  _aliases = {
      "sox_302_enabled": {
          "display_name": "SOX 302 assessment workflow",
          "description": (
              "Allowed values are:\n"
              "YES (Verification step will be skipped if only positive "
              "answers are given for the assessment. Specify negative answers "
              "at column 'Custom attributes')\n"
              "NO (Standard Assessment flow will be used)"
          ),
          "mandatory": False,
      }
  }

  _api_attrs = reflection.ApiAttributes(
      "sox_302_enabled",
  )

  _fulltext_attrs = [
      attributes.BooleanFullTextAttr(
          "sox_302_enabled",
          "sox_302_enabled",
          true_value="yes",
          false_value="no",
      ),
  ]

  @classmethod
  def indexed_query(cls):
    """Return DB query used for object indexing."""
    query = super(WithSOX302Flow, cls).indexed_query()
    return query.options(
        sa_orm.Load(cls).load_only(
            "sox_302_enabled",
        ),
    )
