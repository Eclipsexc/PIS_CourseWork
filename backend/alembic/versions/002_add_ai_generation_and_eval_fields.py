"""Add AI generation tables and evaluation fields

Revision ID: 002
Revises: 001
Create Date: 2026-05-24 10:30:00
"""

from alembic import op

import sqlalchemy as sa


revision = '002'

down_revision = '001'

branch_labels = None

depends_on = None


def upgrade() -> None:

    op.add_column('session_attempts', sa.Column('paused_at', sa.DateTime(), nullable=True))


    op.add_column(

        'ai_evaluations',

        sa.Column('source', sa.String(length=100), nullable=False, server_default='local_embedding')

    )

    op.alter_column('ai_evaluations', 'source', server_default=None)


    op.create_table(

        'ai_generation_usage',

        sa.Column('id', sa.Integer(), nullable=False),

        sa.Column('user_id', sa.Integer(), nullable=False),

        sa.Column('created_at', sa.DateTime(), nullable=False),

        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),

        sa.PrimaryKeyConstraint('id')

    )

    op.create_index(op.f('ix_ai_generation_usage_id'), 'ai_generation_usage', ['id'], unique=False)

    op.create_index(op.f('ix_ai_generation_usage_user_id'), 'ai_generation_usage', ['user_id'], unique=False)

    op.create_index(op.f('ix_ai_generation_usage_created_at'), 'ai_generation_usage', ['created_at'], unique=False)


    op.create_table(

        'ai_generation_cache',

        sa.Column('id', sa.Integer(), nullable=False),

        sa.Column('prompt_hash', sa.String(length=64), nullable=False),

        sa.Column('prompt_text', sa.Text(), nullable=False),

        sa.Column('num_questions', sa.Integer(), nullable=False),

        sa.Column('session_type', sa.String(length=50), nullable=False),

        sa.Column('response_json', sa.JSON(), nullable=False),

        sa.Column('source', sa.String(length=50), nullable=False),

        sa.Column('created_at', sa.DateTime(), nullable=False),

        sa.PrimaryKeyConstraint('id'),

        sa.UniqueConstraint('prompt_hash', name='uq_ai_generation_cache_prompt_hash')

    )

    op.create_index(op.f('ix_ai_generation_cache_id'), 'ai_generation_cache', ['id'], unique=False)

    op.create_index(op.f('ix_ai_generation_cache_prompt_hash'), 'ai_generation_cache', ['prompt_hash'], unique=True)


def downgrade() -> None:

    op.drop_index(op.f('ix_ai_generation_cache_prompt_hash'), table_name='ai_generation_cache')

    op.drop_index(op.f('ix_ai_generation_cache_id'), table_name='ai_generation_cache')

    op.drop_table('ai_generation_cache')


    op.drop_index(op.f('ix_ai_generation_usage_created_at'), table_name='ai_generation_usage')

    op.drop_index(op.f('ix_ai_generation_usage_user_id'), table_name='ai_generation_usage')

    op.drop_index(op.f('ix_ai_generation_usage_id'), table_name='ai_generation_usage')

    op.drop_table('ai_generation_usage')


    op.drop_column('ai_evaluations', 'source')

    op.drop_column('session_attempts', 'paused_at')

