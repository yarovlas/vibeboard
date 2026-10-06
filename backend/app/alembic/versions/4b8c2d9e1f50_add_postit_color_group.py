"""Add color and group_id to post-it

Revision ID: 4b8c2d9e1f50
Revises: 3a7b2c9d1e40
Create Date: 2026-10-06 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "4b8c2d9e1f50"
down_revision = "3a7b2c9d1e40"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "postit",
        sa.Column(
            "color",
            sqlmodel.sql.sqltypes.AutoString(length=32),
            nullable=False,
            server_default="#FEF3C7",
        ),
    )
    op.add_column(
        "postit",
        sa.Column("group_id", postgresql.UUID(as_uuid=True), nullable=True),
    )


def downgrade():
    op.drop_column("postit", "group_id")
    op.drop_column("postit", "color")
