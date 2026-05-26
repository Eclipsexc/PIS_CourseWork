"""Add attempt processing status and video analyses

Revision ID: 003
Revises: 002
Create Date: 2026-05-24 12:50:00
"""

from alembic import op

import sqlalchemy as sa


revision = '003'

down_revision = '002'

branch_labels = None

depends_on = None


def upgrade() -> None:

    bind = op.get_bind()

    dialect = bind.dialect.name


    if dialect == "postgresql":

        op.execute("ALTER TYPE attemptstatus ADD VALUE IF NOT EXISTS 'processing'")


    op.add_column('share_links', sa.Column('recipient_email', sa.String(length=255), nullable=True))


    op.create_table(

        'video_analyses',

        sa.Column('id', sa.Integer(), nullable=False),

        sa.Column('attempt_id', sa.Integer(), nullable=False),

        sa.Column('answer_id', sa.Integer(), nullable=True),

        sa.Column('status', sa.String(length=32), nullable=False),

        sa.Column('duration_seconds', sa.Float(), nullable=True),

        sa.Column('frame_count', sa.Integer(), nullable=True),

        sa.Column('fps', sa.Float(), nullable=True),

        sa.Column('resolution_width', sa.Integer(), nullable=True),

        sa.Column('resolution_height', sa.Integer(), nullable=True),

        sa.Column('face_presence_ratio', sa.Float(), nullable=True),

        sa.Column('estimated_blink_count', sa.Integer(), nullable=True),

        sa.Column('blink_rate_per_minute', sa.Float(), nullable=True),

        sa.Column('gaze_offscreen_ratio', sa.Float(), nullable=True),

        sa.Column('brightness_score', sa.Float(), nullable=True),

        sa.Column('blur_score', sa.Float(), nullable=True),

        sa.Column('quality_score', sa.Float(), nullable=True),

        sa.Column('warnings', sa.JSON(), nullable=True),

        sa.Column('recommendations', sa.JSON(), nullable=True),

        sa.Column('feedback_text', sa.Text(), nullable=True),

        sa.Column('created_at', sa.DateTime(), nullable=False),

        sa.Column('updated_at', sa.DateTime(), nullable=False),

        sa.ForeignKeyConstraint(['answer_id'], ['answers.id']),

        sa.ForeignKeyConstraint(['attempt_id'], ['session_attempts.id']),

        sa.PrimaryKeyConstraint('id')

    )

    op.create_index(op.f('ix_video_analyses_id'), 'video_analyses', ['id'], unique=False)


def downgrade() -> None:

    op.drop_index(op.f('ix_video_analyses_id'), table_name='video_analyses')

    op.drop_table('video_analyses')

    op.drop_column('share_links', 'recipient_email')

