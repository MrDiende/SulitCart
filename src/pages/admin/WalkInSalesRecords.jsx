import { useMemo, useState } from "react";
import { Eye, ReceiptText, Search } from "lucide-react";
import { useStore } from "../../context/StoreContext";
import { formatDate, formatPHP, isOnlineOrder } from "../../utils";
import { PRODUCT_IMAGE_PLACEHOLDER } from "../../utils/productImage";
import { Button, EmptyState, Modal, Surface, TableWrap, thClass, tdClass } from "../../components/UI";
import "../../css/WalkInSalesRecords.css";

const saleDateOptions = { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" };

function SaleDetails({ sale, onClose }) {
  if (!sale) return null;

  return <Modal open onClose={onClose} title={sale.number} description="Walk-in sale record" width="xl">
    <dl className="sale-details__metadata">
      {[
        ["Customer", sale.customer || "Walk-in customer"],
        ["Date / time", formatDate(sale.date, saleDateOptions)],
        ["Processed by", sale.operator],
        ["Payment method", sale.payment || "Not recorded"],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    <h3 className="sale-details__heading">Products sold</h3>
    <div className="sale-details__items">
      {sale.items.map((item, index) => <div key={`${item.productId}-${index}`} className="sale-details__item">
        <img src={item.image || PRODUCT_IMAGE_PLACEHOLDER} alt="" />
        <div className="sale-details__item-info"><p>{item.name}</p><p>Qty {item.quantity} at {formatPHP(item.price)} each</p></div>
        <span>{formatPHP(item.price * item.quantity)}</span>
      </div>)}
    </div>
    <div className="sale-details__total"><span>Total</span><span>{formatPHP(sale.total)}</span></div>
  </Modal>;
}

export default function WalkInSalesRecords() {
  const { orders, inventory, auditLogs } = useStore();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const records = useMemo(() => orders.filter((order) => !isOnlineOrder(order)).map((sale) => ({
    ...sale,
    operator: sale.processedBy
      || inventory.find((entry) => entry.type === "Walk-in sale" && entry.note === sale.number)?.user
      || auditLogs.find((entry) => entry.action === "Walk-in sale" && entry.entity === sale.number)?.user
      || "Not recorded",
  })).sort((a, b) => new Date(b.date) - new Date(a.date)), [orders, inventory, auditLogs]);
  const filtered = useMemo(() => records.filter((sale) => `${sale.number} ${sale.customer} ${sale.operator} ${sale.payment}`.toLowerCase().includes(query.trim().toLowerCase())), [records, query]);
  const selectedSale = records.find((sale) => sale.id === selectedId);

  return <>
    <Surface className="sale-records">
      <div className="sale-records__toolbar">
        <p>{filtered.length} of {records.length} sale records</p>
        <label className="sale-records__search">
          <span className="sale-records__search-label">Search walk-in sale records</span>
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sale, customer, or staff" />
        </label>
      </div>
      {filtered.length ? <TableWrap>
        <thead><tr>{["Sale number", "Customer", "Date / time", "Processed by", "Items", "Payment", "Total", "Actions"].map((label) => <th key={label} className={thClass}>{label}</th>)}</tr></thead>
        <tbody>{filtered.map((sale) => <tr key={sale.id} className="ui-table-row">
          <td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--strong`}>{sale.number}</td>
          <td className={`${tdClass} ui-table-cell--nowrap`}>{sale.customer || "Walk-in customer"}</td>
          <td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small ui-table-cell--muted`}>{formatDate(sale.date, saleDateOptions)}</td>
          <td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small`}>{sale.operator}</td>
          <td className={tdClass}>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
          <td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--small`}>{sale.payment || "Not recorded"}</td>
          <td className={`${tdClass} ui-table-cell--nowrap ui-table-cell--strong`}>{formatPHP(sale.total)}</td>
          <td className={tdClass}><Button variant="ghost" size="sm" className="ui-button--nowrap" onClick={() => setSelectedId(sale.id)} aria-label={`View sale ${sale.number}`}><Eye size={14} />View details</Button></td>
        </tr>)}</tbody>
      </TableWrap> : <EmptyState
        icon={ReceiptText}
        title={records.length ? "No sales match your search" : "No walk-in sales recorded"}
        description={records.length ? "Try another sale number, customer, or staff name." : "Sales completed in the staff workspace will appear here."}
        action={query ? <Button variant="secondary" onClick={() => setQuery("")}>Clear search</Button> : null}
      />}
    </Surface>
    <SaleDetails sale={selectedSale} onClose={() => setSelectedId(null)} />
  </>;
}