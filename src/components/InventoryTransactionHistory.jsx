import { useMemo, useState } from "react";
import { formatDate } from "../utils";
import { Button, Field, Surface, TableWrap, TextInput, thClass, tdClass } from "./UI";
import "../css/InventoryTransactionHistory.css";

export default function InventoryTransactionHistory({ transactions, products }) {
  const [selectedDate, setSelectedDate] = useState("");
  const datedTransactions = useMemo(() => transactions.map((entry) => ({ entry, date: new Date(entry.date) }))
    .filter(({ date }) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime()), [transactions]);
  const filtered = useMemo(() => datedTransactions.filter(({ date }) => {
    if (!selectedDate) return true;
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return localDate === selectedDate;
  }), [datedTransactions, selectedDate]);

  return <Surface className="inventory-history">
    <div className="inventory-history__header">
      <div className="inventory-history__intro">
        <h2>Inventory transaction history</h2>
        <p role="status">Showing {filtered.length} of {datedTransactions.length} transactions.</p>
      </div>
      <div className="inventory-history__filters">
        <Field label="Transaction date" className="inventory-history__date">
          <TextInput type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="ui-input--touch" />
        </Field>
        <Button variant="secondary" onClick={() => setSelectedDate("")} disabled={!selectedDate} className="inventory-history__clear">
          Clear date
        </Button>
      </div>
    </div>
    <TableWrap>
      <thead><tr>{["Date", "Product", "Transaction", "Change", "User", "Note"].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead>
      <tbody>{filtered.length ? filtered.map(({ entry }) => <tr key={entry.id} className="ui-table-row">
        <td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small ui-table-cell--muted`}>{formatDate(entry.date, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
        <td className={tdClass}>{products.find((product) => product.id === entry.productId)?.name || entry.productName || "Deleted product"}</td>
        <td className={tdClass}>{entry.type}</td>
        <td className={`${tdClass} inventory-history__change inventory-history__change--${entry.quantity >= 0 ? "positive" : "negative"}`}>{entry.quantity > 0 ? "+" : ""}{entry.quantity}</td>
        <td className={tdClass}>{entry.user}</td>
        <td className={`${tdClass} ui-table-cell--small ui-table-cell--muted`}>{entry.note}</td>
      </tr>) : <tr><td colSpan="6" className={`${tdClass} ui-table-cell--empty`}>{selectedDate ? "No transactions recorded on this date." : "No inventory transactions recorded yet."}</td></tr>}</tbody>
    </TableWrap>
  </Surface>;
}