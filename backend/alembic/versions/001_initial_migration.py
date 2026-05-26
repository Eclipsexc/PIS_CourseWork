"""Initial migration

Revision ID: 001
Revises:
Create Date: 2026-05-21 21:24:18.642000

"""

from alembic import op

import sqlalchemy as sa

from sqlalchemy.dialects import postgresql


revision = '001'

down_revision = None

branch_labels = None

depends_on = None


def upgrade() -> None:


    op.create_table('users',

    sa.Column('id', sa.Integer(), nullable=False),

    sa.Column('full_name', sa.String(), nullable=False),

    sa.Column('email', sa.String(), nullable=False),

    sa.Column('password_hash', sa.String(), nullable=False),

    sa.Column('role', sa.Enum('user', 'mentor', name='userrole'), nullable=False),

    sa.Column('created_at', sa.DateTime(), nullable=False),

    sa.Column('updated_at', sa.DateTime(), nullable=False),

    sa.PrimaryKeyConstraint('id')

    )

    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)


    op.create_table('session_templates',

    sa.Column('id', sa.Integer(), nullable=False),

    sa.Column('owner_id', sa.Integer(), nullable=False),

    sa.Column('title', sa.String(length=255), nullable=False),

    sa.Column('description', sa.Text(), nullable=True),

    sa.Column('session_type', sa.Enum('practice', 'assessment', name='sessiontype'), nullable=False),

    sa.Column('status', sa.Enum('draft', 'ready', 'locked', 'archived', name='templatestatus'), nullable=False),

    sa.Column('answer_mode', sa.Enum('text', 'voice', 'voice_video', name='answermode'), nullable=False),

    sa.Column('duration_minutes', sa.Integer(), nullable=True),

    sa.Column('allow_pause', sa.Boolean(), nullable=True),

    sa.Column('max_attempts', sa.Integer(), nullable=True),

    sa.Column('strict_timer', sa.Boolean(), nullable=True),

    sa.Column('deadline', sa.DateTime(), nullable=True),

    sa.Column('camera_required', sa.Boolean(), nullable=True),

    sa.Column('voice_required', sa.Boolean(), nullable=True),

    sa.Column('randomized_questions', sa.Boolean(), nullable=True),

    sa.Column('created_at', sa.DateTime(), nullable=False),

    sa.Column('updated_at', sa.DateTime(), nullable=False),

    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),

    sa.PrimaryKeyConstraint('id')

    )

    op.create_index(op.f('ix_session_templates_id'), 'session_templates', ['id'], unique=False)


    op.create_table('questions',

    sa.Column('id', sa.Integer(), nullable=False),

    sa.Column('template_id', sa.Integer(), nullable=False),

    sa.Column('question_text', sa.Text(), nullable=False),

    sa.Column('question_type', sa.Enum('text_question', 'oral_question', 'coding_question', name='questiontype'), nullable=False),

    sa.Column('order_index', sa.Integer(), nullable=False),

    sa.Column('difficulty', sa.String(length=50), nullable=True),

    sa.Column('topic', sa.String(length=255), nullable=True),

    sa.Column('reference_answer', sa.Text(), nullable=True),

    sa.Column('keywords', sa.JSON(), nullable=True),

    sa.Column('evaluation_criteria', sa.JSON(), nullable=True),

    sa.Column('created_at', sa.Integer(), nullable=True),

    sa.ForeignKeyConstraint(['template_id'], ['session_templates.id'], ),

    sa.PrimaryKeyConstraint('id')

    )

    op.create_index(op.f('ix_questions_id'), 'questions', ['id'], unique=False)


    op.create_table('share_links',

    sa.Column('id', sa.Integer(), nullable=False),

    sa.Column('template_id', sa.Integer(), nullable=False),

    sa.Column('token', sa.String(length=255), nullable=False),

    sa.Column('created_by', sa.Integer(), nullable=False),

    sa.Column('expires_at', sa.DateTime(), nullable=True),

    sa.Column('access_type', sa.Enum('public', 'private', name='accesstype'), nullable=False),

    sa.Column('created_at', sa.DateTime(), nullable=False),

    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),

    sa.ForeignKeyConstraint(['template_id'], ['session_templates.id'], ),

    sa.PrimaryKeyConstraint('id')

    )

    op.create_index(op.f('ix_share_links_id'), 'share_links', ['id'], unique=False)

    op.create_index(op.f('ix_share_links_token'), 'share_links', ['token'], unique=True)


    op.create_table('session_attempts',

    sa.Column('id', sa.Integer(), nullable=False),

    sa.Column('template_id', sa.Integer(), nullable=False),

    sa.Column('user_id', sa.Integer(), nullable=False),

    sa.Column('status', sa.Enum('active', 'paused', 'completed', 'cancelled', 'under_review', 'reviewed', 'expired', 'auto_submitted', name='attemptstatus'), nullable=False),

    sa.Column('started_at', sa.DateTime(), nullable=False),

    sa.Column('finished_at', sa.DateTime(), nullable=True),

    sa.Column('paused_duration', sa.Integer(), nullable=True),

    sa.Column('total_score', sa.Float(), nullable=True),

    sa.Column('final_score', sa.Float(), nullable=True),

    sa.Column('ai_score', sa.Float(), nullable=True),

    sa.Column('mentor_score', sa.Float(), nullable=True),

    sa.Column('created_at', sa.DateTime(), nullable=False),

    sa.ForeignKeyConstraint(['template_id'], ['session_templates.id'], ),

    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),

    sa.PrimaryKeyConstraint('id')

    )

    op.create_index(op.f('ix_session_attempts_id'), 'session_attempts', ['id'], unique=False)


    op.create_table('answers',

    sa.Column('id', sa.Integer(), nullable=False),

    sa.Column('attempt_id', sa.Integer(), nullable=False),

    sa.Column('question_id', sa.Integer(), nullable=False),

    sa.Column('answer_text', sa.Text(), nullable=True),

    sa.Column('audio_url', sa.String(length=500), nullable=True),

    sa.Column('video_url', sa.String(length=500), nullable=True),

    sa.Column('transcript', sa.Text(), nullable=True),

    sa.Column('submitted_at', sa.DateTime(), nullable=False),

    sa.Column('duration_seconds', sa.Integer(), nullable=True),

    sa.ForeignKeyConstraint(['attempt_id'], ['session_attempts.id'], ),

    sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ),

    sa.PrimaryKeyConstraint('id')

    )

    op.create_index(op.f('ix_answers_id'), 'answers', ['id'], unique=False)


    op.create_table('mentor_feedbacks',

    sa.Column('id', sa.Integer(), nullable=False),

    sa.Column('attempt_id', sa.Integer(), nullable=False),

    sa.Column('mentor_id', sa.Integer(), nullable=False),

    sa.Column('final_score', sa.Float(), nullable=False),

    sa.Column('comment', sa.Text(), nullable=True),

    sa.Column('override_reason', sa.Text(), nullable=True),

    sa.Column('created_at', sa.DateTime(), nullable=False),

    sa.ForeignKeyConstraint(['attempt_id'], ['session_attempts.id'], ),

    sa.ForeignKeyConstraint(['mentor_id'], ['users.id'], ),

    sa.PrimaryKeyConstraint('id')

    )

    op.create_index(op.f('ix_mentor_feedbacks_id'), 'mentor_feedbacks', ['id'], unique=False)


    op.create_table('ai_evaluations',

    sa.Column('id', sa.Integer(), nullable=False),

    sa.Column('answer_id', sa.Integer(), nullable=False),

    sa.Column('semantic_score', sa.Float(), nullable=True),

    sa.Column('keyword_score', sa.Float(), nullable=True),

    sa.Column('structure_score', sa.Float(), nullable=True),

    sa.Column('completeness_score', sa.Float(), nullable=True),

    sa.Column('speech_score', sa.Float(), nullable=True),

    sa.Column('total_score', sa.Float(), nullable=False),

    sa.Column('feedback_text', sa.Text(), nullable=True),

    sa.Column('weak_points', sa.JSON(), nullable=True),

    sa.Column('recommendations', sa.JSON(), nullable=True),

    sa.Column('missing_concepts', sa.JSON(), nullable=True),

    sa.Column('created_at', sa.DateTime(), nullable=False),

    sa.ForeignKeyConstraint(['answer_id'], ['answers.id'], ),

    sa.PrimaryKeyConstraint('id')

    )

    op.create_index(op.f('ix_ai_evaluations_id'), 'ai_evaluations', ['id'], unique=False)


def downgrade() -> None:

    op.drop_index(op.f('ix_ai_evaluations_id'), table_name='ai_evaluations')

    op.drop_table('ai_evaluations')

    op.drop_index(op.f('ix_mentor_feedbacks_id'), table_name='mentor_feedbacks')

    op.drop_table('mentor_feedbacks')

    op.drop_index(op.f('ix_answers_id'), table_name='answers')

    op.drop_table('answers')

    op.drop_index(op.f('ix_session_attempts_id'), table_name='session_attempts')

    op.drop_table('session_attempts')

    op.drop_index(op.f('ix_share_links_token'), table_name='share_links')

    op.drop_index(op.f('ix_share_links_id'), table_name='share_links')

    op.drop_table('share_links')

    op.drop_index(op.f('ix_questions_id'), table_name='questions')

    op.drop_table('questions')

    op.drop_index(op.f('ix_session_templates_id'), table_name='session_templates')

    op.drop_table('session_templates')

    op.drop_index(op.f('ix_users_id'), table_name='users')

    op.drop_index(op.f('ix_users_email'), table_name='users')

    op.drop_table('users')

