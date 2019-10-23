# Copyright (C) 2019 Google Inc.
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>

"""
update propagation tree for auditor

Create Date: 2019-10-23 18:03:52.757560
"""
# disable Invalid constant name pylint warning for mandatory Alembic variables.
# pylint: disable=invalid-name

from ggrc.migrations.utils.acr_propagation import update_acr_propagation_tree


# revision identifiers, used by Alembic.
revision = 'c3293b765641'
down_revision = 'ac75e70c9081'


PROGRAM_EDITOR_PERMISSIONS = {
    "Assessment RU": {
        "Relationship R": {
            "Comment R": {},
            "Evidence RUD": {
                "Relationship R": {
                    "Comment R": {}
                }
            },
            "Issue R": {}
        }
    },
    "AssessmentTemplate R": {},
    "Evidence R": {
        "Relationship R": {
            "Comment R": {}
        }
    },
    "Issue R": {
        "Relationship R": {
            "Comment R": {},
            "Document R": {
                "Relationship R": {
                    "Comment R": {}
                }
            }
        }
    },
    "Snapshot RU": {}
}


RELATIONSHIP = {"Relationship R": PROGRAM_EDITOR_PERMISSIONS}

PROGRAM_EDITORS = {"Auditors": RELATIONSHIP}

CONTROL_PROPAGATION = {
    "Audit": PROGRAM_EDITORS
}

OLD_CONTROL_PROPAGATION = {
    "Audit": PROGRAM_EDITORS
}


def upgrade():
    """Upgrade database schema and/or data, creating a new revision."""
    update_acr_propagation_tree(OLD_CONTROL_PROPAGATION, CONTROL_PROPAGATION)


def downgrade():
    """Downgrade database schema and/or data back to the previous revision."""
    raise NotImplementedError("Downgrade is not supported")
