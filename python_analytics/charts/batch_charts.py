import pandas as pd
import matplotlib.pyplot as plt

from .theme import THEME, apply_theme, save_png, empty_figure, label_month, style_axes


def student_growth_trend(conn, months: int = 12) -> bytes:
    df = pd.read_sql_query(
        """
        SELECT strftime('%Y-%m', admission_date) AS ym, COUNT(*) AS c
        FROM students
        WHERE admission_date IS NOT NULL
        GROUP BY ym
        ORDER BY ym
        """,
        conn,
    )
    if df.empty:
        return empty_figure("Student Growth Trend")

    df = df.tail(months).reset_index(drop=True)
    df["cumulative"] = df["c"].cumsum()

    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.2))
    labels = [label_month(v) for v in df["ym"]]
    ax.plot(labels, df["cumulative"], marker="o", linewidth=2, color=THEME["orange"])
    ax.fill_between(labels, df["cumulative"], color=THEME["orange"], alpha=0.12)
    ax.set_title("Student Growth Trend (Cumulative)")
    ax.set_ylabel("Total Students")
    style_axes(ax)
    plt.setp(ax.get_xticklabels(), rotation=30, ha="right")
    return save_png(fig)


def monthly_admission_trend(conn, months: int = 12) -> bytes:
    df = pd.read_sql_query(
        """
        SELECT strftime('%Y-%m', admission_date) AS ym, COUNT(*) AS c
        FROM students
        WHERE admission_date IS NOT NULL
        GROUP BY ym
        ORDER BY ym DESC
        LIMIT ?
        """,
        conn, params=(months,),
    )
    if df.empty:
        return empty_figure("Monthly Admission Trend")

    df = df.iloc[::-1]
    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.2))
    labels = [label_month(v) for v in df["ym"]]
    bars = ax.bar(labels, df["c"], color=THEME["success"], width=0.55)
    ax.set_title("Monthly Admission Trend")
    ax.set_ylabel("New Admissions")
    style_axes(ax)

    for bar, value in zip(bars, df["c"]):
        ax.annotate(
            str(int(value)),
            (bar.get_x() + bar.get_width() / 2, bar.get_height()),
            ha="center", va="bottom", fontsize=8, color=THEME["muted"],
        )
    return save_png(fig)


def financial_trend_net(conn, months: int = 12) -> bytes:
    income = pd.read_sql_query(
        """
        SELECT strftime('%Y-%m', payment_date) AS ym,
               COALESCE(SUM(amount), 0) AS income
        FROM payments
        WHERE is_reversed = 0 AND payment_date IS NOT NULL
        GROUP BY ym ORDER BY ym DESC LIMIT ?
        """,
        conn, params=(months,),
    )
    expense = pd.read_sql_query(
        """
        SELECT strftime('%Y-%m', expense_date) AS ym,
               COALESCE(SUM(amount), 0) AS expense
        FROM expenses
        WHERE expense_date IS NOT NULL
        GROUP BY ym ORDER BY ym DESC LIMIT ?
        """,
        conn, params=(months,),
    )
    if income.empty and expense.empty:
        return empty_figure("Financial Trend (Net)")

    df = pd.merge(income, expense, on="ym", how="outer").fillna(0).sort_values("ym")
    df["net"] = df["income"] - df["expense"]

    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.4))
    labels = [label_month(v) for v in df["ym"]]
    colors = [THEME["success"] if v >= 0 else THEME["danger"] for v in df["net"]]
    ax.bar(labels, df["net"], color=colors, width=0.55)
    ax.axhline(0, color=THEME["muted"], linewidth=1)
    ax.set_title("Financial Trend — Net (Collection − Expenses)")
    ax.set_ylabel("PKR")
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f"{int(x):,}"))
    style_axes(ax)
    plt.setp(ax.get_xticklabels(), rotation=30, ha="right")
    return save_png(fig)