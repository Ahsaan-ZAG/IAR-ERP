import pandas as pd
import matplotlib.pyplot as plt

from .theme import (
    THEME, apply_theme, save_png, empty_figure,
    label_month, style_axes, format_pkr,
)


def _monthly(conn, months: int):
    return pd.read_sql_query(
        """
        SELECT strftime('%Y-%m', expense_date) AS ym,
               COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE expense_date IS NOT NULL
        GROUP BY ym
        ORDER BY ym DESC
        LIMIT ?
        """,
        conn, params=(months,),
    )


def monthly_expenses(conn, months: int = 12) -> bytes:
    df = _monthly(conn, months)
    if df.empty:
        return empty_figure("Monthly Expenses")

    df = df.iloc[::-1]
    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.2))
    labels = [label_month(v) for v in df["ym"]]
    bars = ax.bar(labels, df["total"], color=THEME["warning"], width=0.6)
    ax.set_title("Monthly Expenses (PKR)")
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


def income_vs_expense(conn, months: int = 12) -> bytes:
    income = pd.read_sql_query(
        """
        SELECT strftime('%Y-%m', payment_date) AS ym,
               COALESCE(SUM(amount), 0) AS income
        FROM payments
        WHERE is_reversed = 0 AND payment_date IS NOT NULL
        GROUP BY ym
        ORDER BY ym DESC
        LIMIT ?
        """,
        conn, params=(months,),
    )
    expense = _monthly(conn, months)

    if income.empty and expense.empty:
        return empty_figure("Income vs Expense")

    df = pd.merge(
        income.rename(columns={"ym": "ym"}),
        expense.rename(columns={"total": "expense"}),
        on="ym", how="outer",
    ).fillna(0).sort_values("ym")

    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.4))
    labels = [label_month(v) for v in df["ym"]]
    x = range(len(labels))
    width = 0.38

    ax.bar([i - width / 2 for i in x], df["income"], width=width,
           color=THEME["success"], label="Income")
    ax.bar([i + width / 2 for i in x], df["expense"], width=width,
           color=THEME["danger"], label="Expense")

    ax.set_xticks(list(x))
    ax.set_xticklabels(labels)
    ax.set_title("Income vs Expense")
    ax.set_ylabel("PKR")
    ax.yaxis.set_major_formatter(plt.FuncFormatter(format_pkr))
    style_axes(ax)
    ax.legend()
    return save_png(fig)