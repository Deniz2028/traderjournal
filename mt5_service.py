# mt5_service.py
import sys
import json
import argparse
import math
from datetime import datetime, date, timedelta

try:
    import MetaTrader5 as mt5  # type: ignore
except ImportError:  # Mac / MT5 yoksa
    mt5 = None


# -----------------------
# Helper: tarih parse
# -----------------------
def iso_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


# -----------------------
# Dummy summary (Mac / MT5 yoksa)
# -----------------------
def build_dummy_summary(start: date, end: date):
    """
    Macbook'ta ya da MT5 kurulmamışsa kullanılacak demo veri.
    Tarih aralığına göre deterministik ama sahte bir equity curve üretir.
    """
    days = (end - start).days + 1
    if days <= 0:
        days = 30

    # Sahte equity: hafif yukarı trend + volatilite
    equity = []
    balance = 0.0
    for i in range(days):
        d = start + timedelta(days=i)
        # basit sinüsoidal + hafif uptrend
        daily_pnl = math.sin(i / 5.0) * 50.0 + 10.0
        balance += daily_pnl
        equity.append(
            {
                "time": datetime.combine(d, datetime.min.time()).isoformat(),
                "balance": round(balance, 2),
                "profit": round(daily_pnl, 2),
            }
        )

    # Max drawdown hesapla
    peak = -1e18
    max_dd = 0.0
    dd_curve = []
    for pt in equity:
        b = pt["balance"]
        if b > peak:
            peak = b
        dd = peak - b
        dd_curve.append(
            {
                "time": pt["time"],
                "drawdown": round(dd, 2),
            }
        )
        if dd > max_dd:
            max_dd = dd

    # Dummy symbol stats
    symbols = [
        {"symbol": "XAUUSD", "trades": 40, "profit": 820.0, "winrate": 62.5},
        {"symbol": "EURUSD", "trades": 25, "profit": -120.0, "winrate": 44.0},
        {"symbol": "NAS100", "trades": 15, "profit": 540.0, "winrate": 66.7},
    ]

    # Dummy session stats
    sessions = [
        {"session": "Asia", "trades": 30, "profit": 150.0, "winrate": 50.0},
        {"session": "London", "trades": 35, "profit": 620.0, "winrate": 65.7},
        {"session": "New York", "trades": 15, "profit": 470.0, "winrate": 60.0},
    ]

    # Dummy hour-of-day stats (sadece birkaç saat)
    hours = [
        {"hour": 8, "trades": 10, "profit": 120.0, "winrate": 60.0},
        {"hour": 9, "trades": 15, "profit": 200.0, "winrate": 66.7},
        {"hour": 14, "trades": 12, "profit": -50.0, "winrate": 41.7},
        {"hour": 16, "trades": 8, "profit": 180.0, "winrate": 75.0},
    ]

    # Dummy weekday stats (0 = Monday)
    weekdays = [
        {"weekday": 0, "name": "Mon", "trades": 20, "profit": 200.0, "winrate": 55.0},
        {"weekday": 1, "name": "Tue", "trades": 18, "profit": 150.0, "winrate": 58.0},
        {"weekday": 2, "name": "Wed", "trades": 22, "profit": 250.0, "winrate": 63.0},
        {"weekday": 3, "name": "Thu", "trades": 20, "profit": 100.0, "winrate": 52.0},
        {"weekday": 4, "name": "Fri", "trades": 20, "profit": 210.0, "winrate": 60.0},
    ]

    summary = {
        "totalTrades": 80,
        "wins": 50,
        "losses": 30,
        "winrate": 62.5,
        "avgWinMoney": 80.0,
        "avgLossMoney": -60.0,
        "expectancyMoney": 18.0,
        "maxDrawdownMoney": round(max_dd, 2),
        "equityCurve": equity,
        "drawdownCurve": dd_curve,
        "symbols": symbols,
        "sessions": sessions,
        "hours": hours,
        "weekdays": weekdays,
        "longestWinStreak": 7,
        "longestLossStreak": 3,
        "useDummy": True,
    }

    return {
        "ok": True,
        "hasData": True,
        "message": "Running in dummy demo mode (MT5 not available).",
        "summary": summary,
        "useDummy": True,
    }


# -----------------------
# MT5 gerçek veriden summary
# -----------------------
def connect_mt5():
    if mt5 is None:
        return False, "MetaTrader5 Python package is not installed."
    if sys.platform != "win32":
        return False, f"MT5 is only supported on Windows. Current platform: {sys.platform}"
    if not mt5.initialize():
        return False, f"MT5 initialize() failed: {mt5.last_error()}"
    return True, None


def fetch_deals(start_dt: datetime, end_dt: datetime):
    deals = mt5.history_deals_get(start_dt, end_dt)
    if deals is None:
        return []
    return [d._asdict() for d in deals]


def build_real_summary(start: date, end: date):
    # tarih -> datetime
    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(end, datetime.max.time())

    deals_raw = fetch_deals(start_dt, end_dt)

    trade_types = {mt5.DEAL_TYPE_BUY, mt5.DEAL_TYPE_SELL}
    trades = [d for d in deals_raw if d.get("type") in trade_types]

    if not trades:
        return {
            "ok": True,
            "hasData": False,
            "message": "No trades found in this range.",
            "summary": None,
        }

    profits = [float(d.get("profit", 0.0)) for d in trades]
    total_trades = len(trades)
    wins = [p for p in profits if p > 0]
    losses = [p for p in profits if p < 0]

    win_count = len(wins)
    loss_count = len(losses)
    winrate = (win_count / total_trades) * 100.0 if total_trades > 0 else 0.0

    avg_win = sum(wins) / win_count if win_count > 0 else 0.0
    avg_loss = sum(losses) / loss_count if loss_count > 0 else 0.0

    if total_trades > 0 and (win_count > 0 or loss_count > 0):
        p_win = win_count / total_trades
        p_loss = loss_count / total_trades
        expectancy = p_win * avg_win + p_loss * avg_loss
    else:
        expectancy = 0.0

    # Equity & drawdown
    sorted_trades = sorted(
        trades,
        key=lambda d: d.get("time", 0),
    )
    equity = []
    dd_curve = []
    balance = 0.0
    peak = -1e18
    max_dd = 0.0

    for d in sorted_trades:
        profit = float(d.get("profit", 0.0))
        balance += profit
        t = d.get("time")
        if isinstance(t, datetime):
            t_str = t.isoformat()
        else:
            try:
                t_str = datetime.fromtimestamp(t).isoformat()
            except Exception:
                t_str = str(t)
        equity.append(
            {
                "time": t_str,
                "balance": round(balance, 2),
                "profit": round(profit, 2),
            }
        )
        # drawdown
        if balance > peak:
            peak = balance
        dd = peak - balance
        if dd > max_dd:
            max_dd = dd
        dd_curve.append(
            {
                "time": t_str,
                "drawdown": round(dd, 2),
            }
        )

    # Symbol stats
    symbol_stats = {}
    for d in trades:
        sym = d.get("symbol", "UNKNOWN")
        p = float(d.get("profit", 0.0))
        s = symbol_stats.setdefault(
            sym, {"trades": 0, "profit": 0.0, "wins": 0, "losses": 0}
        )
        s["trades"] += 1
        s["profit"] += p
        if p > 0:
            s["wins"] += 1
        elif p < 0:
            s["losses"] += 1

    symbols = []
    for sym, s in symbol_stats.items():
        t = s["trades"]
        w = s["wins"]
        wr = (w / t) * 100.0 if t > 0 else 0.0
        symbols.append(
            {
                "symbol": sym,
                "trades": t,
                "profit": round(s["profit"], 2),
                "winrate": wr,
            }
        )

    # Session stats (çok kaba: hour'a göre)
    def session_of_hour(h: int) -> str:
        # Sadece fikir vermek için:
        # Asia: 0-7, London: 7-14, NY: 14-21
        if 0 <= h < 7:
            return "Asia"
        if 7 <= h < 14:
            return "London"
        if 14 <= h < 21:
            return "New York"
        return "Other"

    sessions_map = {}
    hours_map = {}
    weekdays_map = {}

    for d in trades:
        p = float(d.get("profit", 0.0))
        t = d.get("time")
        if isinstance(t, datetime):
            dt = t
        else:
            try:
                dt = datetime.fromtimestamp(t)
            except Exception:
                continue

        # Session
        sess = session_of_hour(dt.hour)
        s = sessions_map.setdefault(
            sess, {"trades": 0, "profit": 0.0, "wins": 0, "losses": 0}
        )
        s["trades"] += 1
        s["profit"] += p
        if p > 0:
            s["wins"] += 1
        elif p < 0:
            s["losses"] += 1

        # Hour-of-day
        h = dt.hour
        hh = hours_map.setdefault(
            h, {"trades": 0, "profit": 0.0, "wins": 0, "losses": 0}
        )
        hh["trades"] += 1
        hh["profit"] += p
        if p > 0:
            hh["wins"] += 1
        elif p < 0:
            hh["losses"] += 1

        # Weekday
        wd = dt.weekday()
        ww = weekdays_map.setdefault(
            wd, {"trades": 0, "profit": 0.0, "wins": 0, "losses": 0}
        )
        ww["trades"] += 1
        ww["profit"] += p
        if p > 0:
            ww["wins"] += 1
        elif p < 0:
            ww["losses"] += 1

    sessions = []
    for sess, s in sessions_map.items():
        t = s["trades"]
        w = s["wins"]
        wr = (w / t) * 100.0 if t > 0 else 0.0
        sessions.append(
            {
                "session": sess,
                "trades": t,
                "profit": round(s["profit"], 2),
                "winrate": wr,
            }
        )

    hours = []
    for h, s in sorted(hours_map.items(), key=lambda kv: kv[0]):
        t = s["trades"]
        w = s["wins"]
        wr = (w / t) * 100.0 if t > 0 else 0.0
        hours.append(
            {
                "hour": h,
                "trades": t,
                "profit": round(s["profit"], 2),
                "winrate": wr,
            }
        )

    weekdays = []
    names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for wd, s in sorted(weekdays_map.items(), key=lambda kv: kv[0]):
        t = s["trades"]
        w = s["wins"]
        wr = (w / t) * 100.0 if t > 0 else 0.0
        weekdays.append(
            {
                "weekday": wd,
                "name": names[wd] if 0 <= wd < len(names) else str(wd),
                "trades": t,
                "profit": round(s["profit"], 2),
                "winrate": wr,
            }
        )

    # Streaks (win/loss)
    longest_win = 0
    longest_loss = 0
    current_win = 0
    current_loss = 0
    for p in profits:
        if p > 0:
            current_win += 1
            current_loss = 0
        elif p < 0:
            current_loss += 1
            current_win = 0
        else:
            current_win = 0
            current_loss = 0
        if current_win > longest_win:
            longest_win = current_win
        if current_loss > longest_loss:
            longest_loss = current_loss

    summary = {
        "totalTrades": total_trades,
        "wins": win_count,
        "losses": loss_count,
        "winrate": winrate,
        "avgWinMoney": avg_win,
        "avgLossMoney": avg_loss,
        "expectancyMoney": expectancy,
        "maxDrawdownMoney": round(max_dd, 2),
        "equityCurve": equity,
        "drawdownCurve": dd_curve,
        "symbols": symbols,
        "sessions": sessions,
        "hours": hours,
        "weekdays": weekdays,
        "longestWinStreak": longest_win,
        "longestLossStreak": longest_loss,
        "useDummy": False,
    }

    return {
        "ok": True,
        "hasData": True,
        "summary": summary,
    }


# -----------------------
# main()
# -----------------------
def main():
    parser = argparse.ArgumentParser(
        description="MT5 data service for Trade Journal (mega summary)"
    )
    subparsers = parser.add_subparsers(dest="command")

    p_sum = subparsers.add_parser("summary", help="Get account performance summary")
    p_sum.add_argument(
        "--from",
        dest="date_from",
        type=str,
        required=False,
        help="Start date YYYY-MM-DD (default: today - 90 days)",
    )
    p_sum.add_argument(
        "--to",
        dest="date_to",
        type=str,
        required=False,
        help="End date YYYY-MM-DD (default: today)",
    )

    args = parser.parse_args()

    if args.command != "summary":
        print(
            json.dumps(
                {"ok": False, "error": "Unsupported or missing command."},
                default=str,
            )
        )
        return

    today = date.today()
    start = iso_date(args.date_from) if args.date_from else (today - timedelta(days=90))
    end = iso_date(args.date_to) if args.date_to else today
    if start > end:
        start, end = end - timedelta(days=30), end

    # MT5 varsa dene, yoksa/düşerse dummy
    use_dummy = False
    if mt5 is None or sys.platform != "win32":
        use_dummy = True
    else:
        ok, err = connect_mt5()
        if not ok:
            use_dummy = True

    if use_dummy:
        result = build_dummy_summary(start, end)
    else:
        result = build_real_summary(start, end)

    print(json.dumps(result, default=str))


if __name__ == "__main__":
    main()
