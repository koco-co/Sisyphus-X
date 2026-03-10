"""add plan-level report fields

Revision ID: 20260308_plnrpt
Revises: 1cf362f7d6d9
Create Date: 2026-03-08 11:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260308_plnrpt'
down_revision: Union[str, Sequence[str], None] = '1cf362f7d6d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('testreport', sa.Column('plan_id', sa.String(length=36), nullable=True))
    op.add_column('testreport', sa.Column('plan_name', sa.String(length=255), nullable=True))
    op.add_column('testreport', sa.Column('execution_id', sa.String(length=36), nullable=True))
    op.create_index('ix_testreport_plan_id', 'testreport', ['plan_id'], unique=False)
    op.create_index('ix_testreport_execution_id', 'testreport', ['execution_id'], unique=False)

    op.add_column('testreportdetail', sa.Column('scenario_id', sa.String(length=36), nullable=True))
    op.add_column('testreportdetail', sa.Column('scenario_name', sa.String(length=255), nullable=True))
    op.add_column('testreportdetail', sa.Column('method', sa.String(length=20), nullable=True))
    op.add_column('testreportdetail', sa.Column('url', sa.String(length=1000), nullable=True))
    op.create_index('ix_testreportdetail_scenario_id', 'testreportdetail', ['scenario_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_testreportdetail_scenario_id', table_name='testreportdetail')
    op.drop_column('testreportdetail', 'url')
    op.drop_column('testreportdetail', 'method')
    op.drop_column('testreportdetail', 'scenario_name')
    op.drop_column('testreportdetail', 'scenario_id')

    op.drop_index('ix_testreport_execution_id', table_name='testreport')
    op.drop_index('ix_testreport_plan_id', table_name='testreport')
    op.drop_column('testreport', 'execution_id')
    op.drop_column('testreport', 'plan_name')
    op.drop_column('testreport', 'plan_id')
