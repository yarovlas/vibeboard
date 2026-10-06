"""Add collapsed_colors to board

Revision ID: 6d1e4f2a3b70
Revises: 5c9d3e1f2a60
Create Date: 2026-10-06 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "6d1e4f2a3b70"
down_revision = "5c9d3e1f2a60"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "board",
        sa.Column("collapsed_colors", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.execute("UPDATE board SET collapsed_colors = '[]' WHERE collapsed_colors IS NULL")
    op.alter_column(
        "board",
        "collapsed_colors",
        existing_type=postgresql.JSONB(astext_type=sa.Text()),
        nullable=False,
        server_default=sa.text("'[]'::jsonb"),
    )


def downgrade():
    op.drop_column("board", "collapsed_colors")
