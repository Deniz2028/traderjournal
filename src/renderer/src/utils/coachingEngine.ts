
import type { Mt5Summary } from "../types/advanced";
import type { TradeRule } from "./rulesStorage";
import { getDisciplineHistory } from "./rulesStorage";

export interface CoachingAdvice {
    headline: string;
    bullets: string[];
}

/**
 * Basit heuristiklerle, performans + disiplin verisine göre tavsiyeler üretir.
 */
export function generateCoachingAdvice(
    summary: Mt5Summary | null | undefined,
    rules: TradeRule[],
): CoachingAdvice {
    const bullets: string[] = [];
    let headline = "Keep tracking your data.";

    // Disiplin geçmişi (son 14 gün)
    const history = getDisciplineHistory(14, rules);
    const avgDiscipline =
        history.length === 0
            ? null
            : history.reduce((acc, h) => acc + h.score, 0) / history.length;

    if (summary) {
        if (summary.totalTrades < 30) {
            bullets.push(
                "Henüz veri az; en az 30–50 işlem sonrası istatistiklere daha çok güvenebilirsin.",
            );
        }

        if (summary.winrate < 45 && summary.expectancy <= 0) {
            bullets.push(
                "Winrate düşük ve expectancy negatif. Risk/ödül oranını gözden geçirip stop mesafelerini yeniden ayarlamayı düşün.",
            );
        }

        if (summary.maxDrawdown > Math.abs(summary.expectancy) * 20) {
            bullets.push(
                "Max drawdown oldukça yüksek. Pozisyon boyutunu (lot size) küçültmeyi ve eş zamanlı açık işlem sayısını sınırlamayı düşün.",
            );
        }

        const bestSymbol = [...summary.symbols].sort(
            (a, b) => b.winrate - a.winrate,
        )[0];
        if (bestSymbol) {
            bullets.push(
                `En istikrarlı sembolün ${bestSymbol.symbol}. Setup'larını bu sembol üzerinde daha da netleştirerek başlayabilirsin.`,
            );
        }
    }

    if (avgDiscipline !== null) {
        if (avgDiscipline < 50) {
            bullets.push(
                "Disiplin skorun düşük. Önce kuralları basitleştirip sayıyı azalt, sonra gerçekten uygulayabildiğinden emin ol.",
            );
        } else if (avgDiscipline < 80) {
            bullets.push(
                "Disiplin fena değil ama geliştirilebilir. Özellikle zor günlerde kurallara sadık kalmaya odaklan.",
            );
        } else {
            bullets.push(
                "Disiplin skorun yüksek. Bu, uzun vadede performansın istikrarlı olması için en büyük avantajın.",
            );
        }
    } else {
        bullets.push(
            "Henüz disiplin geçmişin yok. EOD Review ekranında kurallarını işaretlemeyi alışkanlık haline getir.",
        );
    }

    // Başlık seçimi
    if (summary && summary.expectancy > 0 && (avgDiscipline ?? 0) >= 70) {
        headline = "Good edge + solid discipline. Keep compounding.";
    } else if (summary && summary.expectancy <= 0 && (avgDiscipline ?? 0) >= 70) {
        headline = "Discipline is there, edge needs refinement.";
    } else if (summary && summary.expectancy > 0 && (avgDiscipline ?? 0) < 70) {
        headline = "You have edge, but discipline is leaking.";
    } else if (avgDiscipline !== null && avgDiscipline < 50) {
        headline = "Fix discipline before adding more size.";
    }

    if (bullets.length === 0) {
        bullets.push(
            "Daha anlamlı öneriler üretmek için biraz daha veri biriktir.",
        );
    }

    return {
        headline,
        bullets,
    };
}
