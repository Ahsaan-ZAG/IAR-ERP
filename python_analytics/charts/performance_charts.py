import pandas as pd
import matplotlib.pyplot as plt

from .theme import THEME, apply_theme, save_png, empty_figure, style_axes


def student_performance_progress(conn, student_id: int | None = None) -> bytes:
    if not student_id:
        return empty_figure("Student Performance Progress", "Select a student")

    student = pd.read_sql_query(
        "SELECT name, roll_no FROM students WHERE id = ?",
        conn, params=(student_id,),
    )
    if student.empty:
        return empty_figure("Student Performance Progress", "Student not found")

    df = pd.read_sql_query(
        """
        SELECT a.exam_date, a.title, a.max_marks, ar.obtained_marks, ar.grade
        FROM assessment_results ar
        JOIN assessments a ON a.id = ar.assessment_id
        WHERE ar.student_id = ?
        ORDER BY a.exam_date, a.id
        """,
        conn, params=(student_id,),
    )
    if df.empty:
        return empty_figure("Student Performance Progress", "No exam results yet")

    df["pct"] = (df["obtained_marks"] / df["max_marks"] * 100).round(1)
    name = student.iloc[0]["name"]
    roll = student.iloc[0]["roll_no"]

    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.4))
    ax.plot(df["exam_date"], df["pct"], marker="o", linewidth=2, color=THEME["orange"])
    ax.axhline(50, linestyle=":", color=THEME["muted"], linewidth=1)

    for x, y, title, grade in zip(df["exam_date"], df["pct"], df["title"], df["grade"]):
        ax.annotate(
            f"{grade or ''}",
            (x, y), ha="center", va="bottom", fontsize=8, color=THEME["muted"],
            xytext=(0, 6), textcoords="offset points",
        )

    ax.set_ylim(0, 105)
    ax.set_title(f"Performance Progress — {name} ({roll})")
    ax.set_ylabel("Percentage")
    plt.setp(ax.get_xticklabels(), rotation=30, ha="right")
    style_axes(ax)
    return save_png(fig)


def batch_completion_chart(conn) -> bytes:
    df = pd.read_sql_query(
        """
        SELECT b.name AS batch,
               COUNT(bs.id) AS total,
               SUM(CASE WHEN bs.status = 'completed' THEN 1 ELSE 0 END) AS completed
        FROM batches b
        LEFT JOIN batch_sessions bs
          ON bs.batch_id = b.id AND bs.session_date >= date('now', 'start of month')
        WHERE b.is_active = 1
        GROUP BY b.id
        ORDER BY b.id
        """,
        conn,
    )
    if df.empty:
        return empty_figure("Batch Completion (This Month)")

    df["pct"] = df.apply(
        lambda r: round((r["completed"] / r["total"]) * 100, 1) if r["total"] else 0.0,
        axis=1,
    )

    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.2))
    bars = ax.bar(df["batch"], df["pct"], color=THEME["orange"], width=0.55)
    ax.set_ylim(0, 110)
    ax.set_title("Batch Completion % — This Month")
    ax.set_ylabel("Completion %")
    style_axes(ax)

    for bar, pct, done, total in zip(bars, df["pct"], df["completed"], df["total"]):
        ax.annotate(
            f"{pct:.0f}% ({int(done)}/{int(total)})",
            (bar.get_x() + bar.get_width() / 2, bar.get_height()),
            ha="center", va="bottom", fontsize=8, color=THEME["muted"],
        )
    return save_png(fig)