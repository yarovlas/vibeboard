"""Add post-it table

Revision ID: 2f8c1d4e6a90
Revises: c9d1e7a4b2f5
Create Date: 2026-09-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "2f8c1d4e6a90"
down_revision = "c9d1e7a4b2f5"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "postit",
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column(
            "content", sqlmodel.sql.sqltypes.AutoString(length=10000), nullable=False
        ),
        sa.Column("x", sa.Float(), nullable=False),
        sa.Column("y", sa.Float(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("board_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["board_id"],
            ["board.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_postit_board_id"), "postit", ["board_id"], unique=False
    )


def downgrade():
    op.drop_index(op.f("ix_postit_board_id"), table_name="postit")
    op.drop_table("postit")
