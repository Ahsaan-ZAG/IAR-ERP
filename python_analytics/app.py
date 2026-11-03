import os

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import Response

from . import database
from .charts import (
    fee_charts, expense_charts, attendance_charts,
    performance_charts, batch_charts,
)

INTERNAL_KEY = os.environ.get("INTERNAL_API_KEY", "dev-internal-key-change-in-production")

app = FastAPI(
    title="Imam Ahmed Raza Academy — Analytics",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


def _guard(x_internal_key: str | None) -> None:
    if not x_internal_key or x_internal_key != INTERNAL_KEY:
        raise HTTPException(status_code=401, detail="unauthorized")


def _png(payload: bytes) -> Response:
    return Response(
        content=payload,
        media_type="image/png",
        headers={"Cache-Control": "no-store"},
    )


@app.get("/health")
def health(x_internal_key: str | None = Header(default=None)):
    _guard(x_internal_key)
    with database.get_ro_connection() as conn:
        conn.execute("SELECT 1").fetchone()
    return {"status": "ok", "service": "analytics", "db": "connected"}


@app.get("/charts/fee-monthly")
def chart_fee_monthly(
    months: int = Query(default=12, ge=1, le=36),
    x_internal_key: str | None = Header(default=None),
):
    _guard(x_internal_key)
    with database.get_ro_connection() as conn:
        return _png(fee_charts.monthly_fee_collection(conn, months))


@app.get("/charts/expenses-monthly")
def chart_expenses_monthly(
    months: int = Query(default=12, ge=1, le=36),
    x_internal_key: str | None = Header(default=None),
):
    _guard(x_internal_key)
    with database.get_ro_connection() as conn:
        return _png(expense_charts.monthly_expenses(conn, months))


@app.get("/charts/income-vs-expense")
def chart_income_vs_expense(
    months: int = Query(default=12, ge=1, le=36),
    x_internal_key: str | None = Header(default=None),
):
    _guard(x_internal_key)
    with database.get_ro_connection() as conn:
        return _png(expense_charts.income_vs_expense(conn, months))


@app.get("/charts/attendance-trend")
def chart_attendance_trend(
    days: int = Query(default=30, ge=7, le=180),
    x_internal_key: str | None = Header(default=None),
):
    _guard(x_internal_key)
    with database.get_ro_connection() as conn:
        return _png(attendance_charts.attendance_trend(conn, days))


@app.get("/charts/batch-attendance")
def chart_batch_attendance(
    days: int = Query(default=30, ge=7, le=180),
    x_internal_key: str | None = Header(default=None),
):
    _guard(x_internal_key)
    with database.get_ro_connection() as conn:
        return _png(attendance_charts.batch_attendance_comparison(conn, days))


@app.get("/charts/student-performance")
def chart_student_performance(
    student_id: int | None = Query(default=None),
    x_internal_key: str | None = Header(default=None),
):
    _guard(x_internal_key)
    with database.get_ro_connection() as conn:
        return _png(performance_charts.student_performance_progress(conn, student_id))


@app.get("/charts/batch-completion")
def chart_batch_completion(x_internal_key: str | None = Header(default=None)):
    _guard(x_internal_key)
    with database.get_ro_connection() as conn:
        return _png(performance_charts.batch_completion_chart(conn))


@app.get("/charts/outstanding")
def chart_outstanding(x_internal_key: str | None = Header(default=None)):
    _guard(x_internal_key)
    with database.get_ro_connection() as conn:
        return _png(fee_charts.outstanding_analysis(conn))


@app.get("/charts/student-growth")
def chart_student_growth(
    months: int = Query(default=12, ge=1, le=36),
    x_internal_key: str | None = Header(default=None),
):
    _guard(x_internal_key)
    with database.get_ro_connection() as conn:
        return _png(batch_charts.student_growth_trend(conn, months))


@app.get("/charts/teacher-attendance")
def chart_teacher_attendance(
    days: int = Query(default=30, ge=7, le=180),
    x_internal_key: str | None = Header(default=None),
):
    _guard(x_internal_key)
    with database.get_ro_connection() as conn:
        return _png(attendance_charts.teacher_attendance_analysis(conn, days))


@app.get("/charts/admission-trend")
def chart_admission_trend(
    months: int = Query(default=12, ge=1, le=36),
    x_internal_key: str | None = Header(default=None),
):
    _guard(x_internal_key)
    with database.get_ro_connection() as conn:
        return _png(batch_charts.monthly_admission_trend(conn, months))


@app.get("/charts/financial-trend")
def chart_financial_trend(
    months: int = Query(default=12, ge=1, le=36),
    x_internal_key: str | None = Header(default=None),
):
    _guard(x_internal_key)
    with database.get_ro_connection() as conn:
        return _png(batch_charts.financial_trend_net(conn, months))