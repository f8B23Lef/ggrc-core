
# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

"""Add log_events

Revision ID: 3288290c842a
Revises: 4dceb701509f
Create Date: 2013-05-30 01:35:29.944450

"""

# revision identifiers, used by Alembic.
revision = '3288290c842a'
down_revision = '4dceb701509f'

from alembic import op
import sqlalchemy as sa


def upgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.create_table('log_events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('severity', sa.String(length=250), nullable=True),
    sa.Column('whodunnit', sa.String(length=250), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    ### end Alembic commands ###


def downgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('log_events')
    ### end Alembic commands ###
