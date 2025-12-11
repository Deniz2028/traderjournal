import sys
import json
import argparse
from datetime import datetime, timedelta

try:
    import MetaTrader5 as mt5
except ImportError:
    mt5 = None


def iso_date(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%d")


def connect_mt5():
    if mt5 is None:
        return False, "MetaTrader5 Python package is not installed. Run: pip install MetaTrader5"
    if not mt5.initialize():
        return False, f"MT5 initialize() failed: {mt5.last_error()}"
    return True, None


def fetch_deals(start: datetime, end: datetime):
    deals = mt5.history_deals_get(start, end)
    if deals is None:
        return []
    return [d._asdict() for d in deals]


def build_summary(start: datetime, end: datetime):
    deals_raw = fetch_deals(start, end)

    # Sadece BUY/SELL type'ları al (deposit, commission vb. dışarı)
    trade_types = {mt5.DEAL_TYPE_BUY, mt5.DEAL_TYPE_SELL}
    trades = [
        d for d in deals_raw
        if d.get("type") in trade_types
    ]

    if not trades:
        return {
            "ok": True,
            "hasData": False,
            "message": "No trades found in this range.",
            "summary": None,
        }

    # Basit metrikler
    total_trades = len(trades)
    profits = [d.get("profit", 0.0) for d in trades]
    wins = [p for p in profits if p > 0]
    losses = [p for p in profits if p < 0]

    win_count = len(wins)
    loss_count = len(losses)
    winrate = (win_count / total_trades) * 100.0 if total_trades > 0 else 0.0

    avg_win = sum(wins) / win_count if win_count > 0 else 0.0
    avg_loss = sum(losses) / loss_count if loss_count > 0 else 0.0

    # Expectancy (para cinsinden – R değil)
    if total_trades > 0 and (win_count > 0 or loss_count > 0):
        p_win = win_count / total_trades
        p_loss = loss_count / total_trades
        expectancy = p_win * avg_win + p_loss * avg_loss
    else:
        expectancy = 0.0

    # Equity curve için tarih sıralı cumulative profit
    sorted_trades = sorted(
        trades,
        key=lambda d: d.get("time", 0)
    )
    equity = []
    balance = 0.0
    for d in sorted_trades:
        profit = d.get("profit", 0.0)
        balance += profit
        t = d.get("time")
        # time alanı datetime ise isoformat'a çevir
        if isinstance(t, datetime):
            t_str = t.isoformat()
        else:
            # mt5._asdict() içinde time timestamp olabiliyor
            try:
                t_str = datetime.fromtimestamp(t).isoformat()
            except Exception:
                t_str = str(t)
        equity.append({
            "time": t_str,
            "balance": balance,
            "profit": profit,
        })

    # Max drawdown (basit)
    peak = -1e18
    max_dd = 0.0
    for point in equity:
        b = point["balance"]
        if b > peak:
            peak = b
        dd = peak - b
        if dd > max_dd:
            max_dd = dd

    # Sembol bazlı özet
    symbol_stats = {}
    for d in trades:
        sym = d.get("symbol", "UNKNOWN")
        p = d.get("profit", 0.0)
        s = symbol_stats.setdefault(sym, {"trades": 0, "profit": 0.0, "wins": 0, "losses": 0})
        s["trades"] += 1
        s["profit"] += p
        if p > 0:
            s["wins"] += 1
        elif p < 0:
            s["losses"] += 1

    symbol_list = []
    for sym, s in symbol_stats.items():
        w = s["wins"]
        t = s["trades"]
        wr = (w / t) * 100.0 if t > 0 else 0.0
        symbol_list.append({
            "symbol": sym,
            "trades": t,
            "profit": s["profit"],
            "winrate": wr,
        })

    summary = {
        "totalTrades": total_trades,
        "wins": win_count,
        "losses": loss_count,
        "winrate": winrate,
        "avgWin": avg_win,
        "avgLoss": avg_loss,
        "expectancy": expectancy,
        "maxDrawdown": max_dd,
        "equityCurve": equity,
        "symbols": symbol_list,
    }

    return {
        "ok": True,
        "hasData": True,
        "summary": summary,
    }


def main():
    parser = argparse.ArgumentParser(description="MT5 data service for Trade Journal")
    subparsers = parser.add_subparsers(dest="command")

    # summary komutu
    p_sum = subparsers.add_parser("summary", help="Get account performance summary")
    p_sum.add_argument("--from", dest="date_from", type=str, required=False,
                       help="Start date YYYY-MM-DD (default: today - 90 days)")
    p_sum.add_argument("--to", dest="date_to", type=str, required=False,
                       help="End date YYYY-MM-DD (default: today)")

    args = parser.parse_args()

    if args.command != "summary":
        # Hatalı / eksik komut
        print(json.dumps({"ok": False, "error": "Unsupported or missing command."}))
        return

    ok, err = connect_mt5()
    if not ok:
        print(json.dumps({"ok": False, "error": err}))
        return

    today = datetime.now().date()
    start = iso_date(args.date_from) if args.date_from else (today - timedelta(days=90))
    end = iso_date(args.date_to) if args.date_to else today

    # date objeleri datetime'a çevir
    if isinstance(start, datetime):
        s_dt = start
    else:
        s_dt = datetime.combine(start, datetime.min.time())
    if isinstance(end, datetime):
        e_dt = end
    else:
        e_dt = datetime.combine(end, datetime.max.time())

    result = build_summary(s_dt, e_dt)
    print(json.dumps(result, default=str))


if __name__ == "__main__":
    main()
