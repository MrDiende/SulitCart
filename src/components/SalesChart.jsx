import { formatPHP } from "../utils";
import "../css/SalesChart.css";

export default function SalesChart({ orders, days = 7, compact = false }) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const completed = orders.filter((order) => order.status === "Completed" && new Date(order.date).getTime() >= cutoff);
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const amount = completed.filter((order) => new Date(order.date).toDateString() === date.toDateString()).reduce((sum, order) => sum + order.total, 0);
    return { label: date.toLocaleDateString("en-PH", { weekday: "short" }), amount };
  });
  const maximum = Math.max(...buckets.map((bucket) => bucket.amount), 1);

  return <div className={`sales-chart ${compact ? "sales-chart--compact" : ""}`}>
    {buckets.map((bucket, index) => {
      const height = bucket.amount ? Math.max((bucket.amount / maximum) * 100, 5) : 3;
      return <div key={`${bucket.label}-${index}`} className="sales-chart__column">
        <svg className="sales-chart__plot" viewBox="0 0 40 100" preserveAspectRatio="none" role="img" aria-label={`${bucket.label}: ${formatPHP(bucket.amount)}`}>
          <title>{bucket.label}: {formatPHP(bucket.amount)}</title>
          <rect x="0" y={100 - height} width="40" height={height} rx="3" className={`sales-chart__bar ${index === 6 ? "sales-chart__bar--current" : ""}`} />
        </svg>
        <span className="sales-chart__label">{bucket.label}</span>
      </div>;
    })}
  </div>;
}