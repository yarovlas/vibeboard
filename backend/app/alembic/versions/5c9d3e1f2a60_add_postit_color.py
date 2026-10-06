"""Add color to post-it

Revision ID: 5c9d3e1f2a60
Revises: 3a7b2c9d1e40
Create Date: 2026-10-06 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = "5c9d3e1f2a60"
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


def downgrade():
    op.drop_column("postit", "color")
