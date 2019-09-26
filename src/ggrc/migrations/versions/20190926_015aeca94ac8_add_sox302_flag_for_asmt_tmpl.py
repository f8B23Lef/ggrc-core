# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
Add SOX302 flag for Assessment Template.

Create Date: 2019-09-26 14:47:27.433156
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "015aeca94ac8"
down_revision = "75ad21f0622b"


def add_sox302_flag():
  """Add `sox_302_enabled` flag on `assessment_templates` table."""
  op.execute(sa.text("""
      ALTER TABLE assessment_templates
        ADD sox_302_enabled TINYINT(1) NOT NULL DEFAULT 0
  """))


def upgrade():
  """Upgrade database schema and/or data, creating a new revision."""
  add_sox302_flag()


def downgrade():
  """Downgrade database schema and/or data back to the previous revision."""
  raise NotImplementedError("Downgrade is not supported")
