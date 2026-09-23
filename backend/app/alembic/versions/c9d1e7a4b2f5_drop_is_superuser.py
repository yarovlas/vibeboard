"""Remove is_superuser from user table

Revision ID: c9d1e7a4b2f5
Revises: b7c41a92e05d
Create Date: 2026-09-23 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c9d1e7a4b2f5'
down_revision = 'b7c41a92e05d'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column('user', 'is_superuser')


def downgrade():
    op.add_column(
        'user',
        sa.Column(
            'is_superuser',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
