"""Add demo attempt statuses

Revision ID: 005
Revises: 004
Create Date: 2026-05-26 01:10:00
"""

from alembic import op


revision = "005"

down_revision = "004"

branch_labels = None

depends_on = None


def upgrade() -> None:

    bind = op.get_bind()

    if bind.dialect.name == "postgresql":

        op.execute("ALTER TYPE attemptstatus ADD VALUE IF NOT EXISTS 'in_progress'")

        op.execute("ALTER TYPE attemptstatus ADD VALUE IF NOT EXISTS 'failed'")


def downgrade() -> None:


    pass

