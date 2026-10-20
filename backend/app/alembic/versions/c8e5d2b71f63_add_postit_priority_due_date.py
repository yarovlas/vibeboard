"""Add priority and due_date to post-it

Revision ID: c8e5d2b71f63
Revises: b3f7c1a92d54
Create Date: 2026-10-20 12:30:00.000000

"""

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = "c8e5d2b71f63"
down_revision = "b3f7c1a92d54"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "postit",
        sa.Column(
            "priority",
            sqlmodel.sql.sqltypes.AutoString(length=16),
            nullable=True,
        ),
    )
    op.add_column(
        "postit",
        sa.Column(
            "due_date",
            sa.Date(),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column("postit", "due_date")
    op.drop_column("postit", "priority")
