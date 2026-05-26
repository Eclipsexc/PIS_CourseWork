"""Add summarized voice video metrics

Revision ID: 004
Revises: 003
Create Date: 2026-05-25 14:30:00
"""

from alembic import op

import sqlalchemy as sa


revision = '004'

down_revision = '003'

branch_labels = None

depends_on = None


def upgrade() -> None:

    op.add_column('video_analyses', sa.Column('speaking_activity_ratio', sa.Float(), nullable=True))

    op.add_column('video_analyses', sa.Column('speaking_stability', sa.Float(), nullable=True))

    op.add_column('video_analyses', sa.Column('confidence_heuristic', sa.Float(), nullable=True))


def downgrade() -> None:

    op.drop_column('video_analyses', 'confidence_heuristic')

    op.drop_column('video_analyses', 'speaking_stability')

    op.drop_column('video_analyses', 'speaking_activity_ratio')

