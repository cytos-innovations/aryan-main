import { Component } from "react";
import { BillingProvider, useBillingContext } from "./bill/state/billing-context";
import { BILLING_VIEW } from "./bill/constants/billing";
import TableSelectView from "./bill/views/table-select";
import OrderEntryView from "./bill/views/order-entry";

class BillingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
          <p className="text-sm font-medium text-foreground">Something went wrong</p>
          <p className="text-xs text-center max-w-xs opacity-70">{String(this.state.error)}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="text-xs px-3 py-1.5 rounded border hover:bg-muted transition-colors text-foreground"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function BillingPage() {
  return (
    <BillingProvider>
      <BillingErrorBoundary>
        <BillingScreen />
      </BillingErrorBoundary>
    </BillingProvider>
  );
}

function BillingScreen() {
  const { view } = useBillingContext();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {view === BILLING_VIEW.TABLE_SELECT && <TableSelectView />}
      {view === BILLING_VIEW.ORDER_ENTRY  && <OrderEntryView />}
      {view === BILLING_VIEW.BILL_PREVIEW && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
          Bill preview — coming next phase
        </div>
      )}
      {view === BILLING_VIEW.PAYMENT && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
          Payment — coming next phase
        </div>
      )}
    </div>
  );
}
