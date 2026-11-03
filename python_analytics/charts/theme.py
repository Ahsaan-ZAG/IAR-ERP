import io
from datetime import datetime

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

THEME = {
    "bg": "#F5F6FA",
    "card": "#FFFFFF",
    "text": "#20212A",
    "muted": "#737784",
    "orange": "#F47B20",
    "success": "#16A36A",
    "danger": "#DC4545",
    "warning": "#E6A23C",
    "grid": "#E8EAF0",
}


def apply_theme():
    plt.rcParams.update({
        "figure.facecolor": THEME["card"],
        "axes.facecolor": THEME["card"],
        "axes.edgecolor": "#E0E2E8",
        "axes.labelcolor": THEME["muted"],
        "axes.titlecolor": THEME["text"],
        "axes.titlesize": 13,
        "axes.titleweight": "bold",
        "axes.labelsize": 10,
        "xtick.color": THEME["muted"],
        "ytick.color": THEME["muted"],
        "xtick.labelsize": 9,
        "ytick.labelsize": 9,
        "font.size": 10,
        "grid.color": THEME["grid"],
        "grid.linestyle": "--",
        "grid.alpha": 0.6,
        "legend.frameon": False,
        "legend.fontsize": 9,
        "savefig.dpi": 130,
    })


def save_png(fig) -> bytes:
    buf = io.BytesIO()
    fig.tight_layout()
    fig.savefig(buf, format="png", bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    return buf.getvalue()


def empty_figure(title: str, message: str = "No data available") -> bytes:
    apply_theme()
    fig, ax = plt.subplots(figsize=(9, 4.2))
    ax.axis("off")
    ax.set_title(title, pad=16)
    ax.text(0.5, 0.5, message, ha="center", va="center",
            color=THEME["muted"], fontsize=12, transform=ax.transAxes)
    return save_png(fig)


def label_month(ym: str) -> str:
    try:
        y, m = ym.split("-")[:2]
        return datetime(int(y), int(m), 1).strftime("%b %y")
    except Exception:
        return ym


def style_axes(ax, grid_axis: str = "y"):
    ax.grid(axis=grid_axis)
    ax.set_axisbelow(True)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)


def format_pkr(x, _pos=None) -> str:
    return f"{int(x):,}"