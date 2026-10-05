"""Add stroke table

Revision ID: 3a7b2c9d1e40
Revises: 2f8c1d4e6a90
Create Date: 2026-10-05 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "3a7b2c9d1e40"
down_revision = "2f8c1d4e6a90"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "stroke",
        sa.Column("points", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("color", sqlmodel.sql.sqltypes.AutoString(length=32), nullable=False),
        sa.Column("width", sa.Float(), nullable=False),
        sa.Column("tool", sqlmodel.sql.sqltypes.AutoString(length=32), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("board_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["board_id"],
            ["board.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_stroke_board_id"), "stroke", ["board_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_stroke_board_id"), table_name="stroke")
    op.drop_table("stroke")
