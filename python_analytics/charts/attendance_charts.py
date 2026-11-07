import pandas as pd
import matplotlib.pyplot as plt

from .theme import THEME, apply_theme, save_png, empty_figure, style_axes

_STATUS_COLORS = {
    "present": THEME["success"],
    "absent": THEME["danger"],
    "late": THEME["warning"],
}


def attendance_trend(conn, days: int = 30) -> bytes:
    df = pd.read_sql_query(
        """
        SELECT date, status, COUNT(*) AS c
        FROM attendance
        WHERE date >= date('now', ?)
        GROUP BY date, status
        ORDER BY date
        """,
        conn, params=(f"-{days - 1} days",),
    )
    if df.empty:
        return empty_figure("Student Attendance Trend")

    pivot = df.pivot_table(index="date", columns="status", values="c",
                           aggfunc="sum", fill_value=0).reset_index()
    for status in ("present", "absent", "late"):
        if status not in pivot.columns:
            pivot[status] = 0
    pivot = pivot.sort_values("date")

    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.4))
    for status in ("present", "absent", "late"):
        ax.plot(pivot["date"], pivot[status], marker="o", markersize=3,
                linewidth=1.8, color=_STATUS_COLORS[status], label=status.title())

    ax.set_title(f"Student Attendance — Last {days} Days")
    ax.set_ylabel("Students")
    step = max(1, len(pivot) // 8)
    ax.set_xticks(range(0, len(pivot), step))
    ax.set_xticklabels(pivot["date"].tolist()[::step], rotation=30, ha="right")
    style_axes(ax)
    ax.legend()
    return save_png(fig)


def batch_attendance_comparison(conn, days: int = 30) -> bytes:
    df = pd.read_sql_query(
        """
        SELECT b.name AS batch, a.status, COUNT(*) AS c
        FROM attendance a
        JOIN batches b ON b.id = a.batch_id
        WHERE a.date >= date('now', ?)
        GROUP BY b.name, a.status
        ORDER BY b.name
        """,
        conn, params=(f"-{days - 1} days",),
    )
    if df.empty:
        return empty_figure("Batch-wise Attendance Comparison")

    pivot = df.pivot_table(index="batch", columns="status", values="c",
                           aggfunc="sum", fill_value=0)
    for status in ("present", "absent", "late"):
        if status not in pivot.columns:
            pivot[status] = 0

    batches = pivot.index.tolist()
    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.4))
    x = range(len(batches))
    width = 0.26

    ax.bar([i - width for i in x], pivot["present"], width=width,
           color=THEME["success"], label="Present")
    ax.bar(list(x), pivot["absent"], width=width,
           color=THEME["danger"], label="Absent")
    ax.bar([i + width for i in x], pivot["late"], width=width,
           color=THEME["warning"], label="Late")

    ax.set_xticks(list(x))
    ax.set_xticklabels(batches, rotation=15, ha="right")
    ax.set_title(f"Batch-wise Attendance — Last {days} Days")
    ax.set_ylabel("Records")
    style_axes(ax)
    ax.legend()
    return save_png(fig)


def teacher_attendance_analysis(conn, days: int = 30) -> bytes:
    df = pd.read_sql_query(
        """
        SELECT u.display_name AS teacher, ta.status, COUNT(*) AS c
        FROM teacher_attendance ta
        JOIN users u ON u.id = ta.user_id
        WHERE ta.date >= date('now', ?)
        GROUP BY u.display_name, ta.status
        ORDER BY u.display_name
        """,
        conn, params=(f"-{days - 1} days",),
    )
    if df.empty:
        return empty_figure("Teacher Attendance Analysis")

    pivot = df.pivot_table(index="teacher", columns="status", values="c",
                           aggfunc="sum", fill_value=0)
    for status in ("present", "absent", "late", "leave"):
        if status not in pivot.columns:
            pivot[status] = 0

    teachers = pivot.index.tolist()
    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.2))
    x = range(len(teachers))
    width = 0.2
    colors = {
        "present": THEME["success"],
        "absent": THEME["danger"],
        "late": THEME["warning"],
        "leave": THEME["muted"],
    }

    for idx, status in enumerate(("present", "absent", "late", "leave")):
        ax.bar([i + (idx - 1.5) * width for i in x], pivot[status], width=width,
               color=colors[status], label=status.title())

    ax.set_xticks(list(x))
    ax.set_xticklabels(teachers)
    ax.set_title(f"Teacher Attendance — Last {days} Days")
    ax.set_ylabel("Days")
    style_axes(ax)
    ax.legend(ncol=4)
    return save_png(fig)