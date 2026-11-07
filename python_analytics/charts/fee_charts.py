import pandas as pd
import matplotlib.pyplot as plt

from .theme import (
    THEME, apply_theme, save_png, empty_figure,
    label_month, style_axes, format_pkr,
)


def monthly_fee_collection(conn, months: int = 12) -> bytes:
    df = pd.read_sql_query(
        """
        SELECT strftime('%Y-%m', payment_date) AS ym,
               COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE is_reversed = 0 AND payment_date IS NOT NULL
        GROUP BY ym
        ORDER BY ym DESC
        LIMIT ?
        """,
        conn, params=(months,),
    )
    if df.empty:
        return empty_figure("Monthly Fee Collection")

    df = df.iloc[::-1]
    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.2))
    labels = [label_month(v) for v in df["ym"]]
    bars = ax.bar(labels, df["total"], color=THEME["orange"], width=0.6)
    ax.set_title("Monthly Fee Collection (PKR)")
    ax.set_ylabel("PKR")
    ax.yaxis.set_major_formatter(plt.FuncFormatter(format_pkr))
    style_axes(ax)

    for bar, value in zip(bars, df["total"]):
        ax.annotate(
            f"{int(value):,}",
            (bar.get_x() + bar.get_width() / 2, bar.get_height()),
            ha="center", va="bottom", fontsize=8, color=THEME["muted"],
        )
    return save_png(fig)


def outstanding_analysis(conn) -> bytes:
    totals = pd.read_sql_query(
        """
        SELECT s.id, s.name, s.roll_no,
               COALESCE((SELECT SUM(amount) FROM student_fee_ledger WHERE student_id = s.id), 0) AS balance
        FROM students s
        WHERE s.status = 'active'
        """,
        conn,
    )
    if totals.empty:
        return empty_figure("Outstanding Fee Analysis")

    owing = totals[totals["balance"] > 0].sort_values("balance", ascending=False)
    if owing.empty:
        return empty_figure("Outstanding Fee Analysis", "No outstanding balances")

    top = owing.head(10)
    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.6))
    labels = [f"{r.name} ({r.roll_no})" for r in top.itertuples()]
    bars = ax.barh(labels[::-1], top["balance"].tolist()[::-1], color=THEME["danger"], height=0.6)
    ax.set_title(f"Top Outstanding Balances — Total PKR {int(owing['balance'].sum()):,}")
    ax.set_xlabel("PKR")
    ax.xaxis.set_major_formatter(plt.FuncFormatter(format_pkr))
    style_axes(ax, grid_axis="x")

    for bar, value in zip(bars, top["balance"].tolist()[::-1]):
        ax.annotate(
            f"{int(value):,}",
            (bar.get_width(), bar.get_y() + bar.get_height() / 2),
            ha="left", va="center", fontsize=8, color=THEME["muted"],
            xytext=(4, 0), textcoords="offset points",
        )
    return save_png(fig)


def financial_collection_trend(conn, months: int = 12) -> bytes:
    df = pd.read_sql_query(
        """
        SELECT strftime('%Y-%m', payment_date) AS ym,
               COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE is_reversed = 0 AND payment_date IS NOT NULL
        GROUP BY ym
        ORDER BY ym DESC
        LIMIT ?
        """,
        conn, params=(months,),
    )
    if df.empty:
        return empty_figure("Financial Collection Trend")

    df = df.iloc[::-1].reset_index(drop=True)
    df["ma3"] = df["total"].rolling(window=3, min_periods=1).mean()

    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.2))
    labels = [label_month(v) for v in df["ym"]]
    ax.plot(labels, df["total"], marker="o", color=THEME["orange"], linewidth=2, label="Collection")
    ax.plot(labels, df["ma3"], linestyle="--", color=THEME["muted"], linewidth=1.5, label="3-month avg")
    ax.set_title("Financial Collection Trend")
    ax.set_ylabel("PKR")
    ax.yaxis.set_major_formatter(plt.FuncFormatter(format_pkr))
    style_axes(ax)
    ax.legend()
    return save_png(fig)