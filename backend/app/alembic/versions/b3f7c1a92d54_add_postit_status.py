"""Add status to post-it

Revision ID: b3f7c1a92d54
Revises: 6d1e4f2a3b70
Create Date: 2026-10-20 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = "b3f7c1a92d54"
down_revision = "6d1e4f2a3b70"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "postit",
        sa.Column(
            "status",
            sqlmodel.sql.sqltypes.AutoString(length=16),
            nullable=False,
            server_default="TODO",
        ),
    )


def downgrade():
    op.drop_column("postit", "status")
