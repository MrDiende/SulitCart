import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { useAlert } from "./Alert";

export const checkoutLoginPath = "/login?redirect=/checkout";
export const checkoutSignInMessage = "Please sign in to your customer account before checkout.";

export default function RequireCustomerCheckout({ children }) {
  const { canCheckout } = useStore();
  const { notify } = useAlert();

  useEffect(() => {
    if (!canCheckout) notify(checkoutSignInMessage, { id: "checkout-sign-in", type: "warning" });
  }, [canCheckout, notify]);

  if (!canCheckout) return <Navigate to={checkoutLoginPath} replace />;
  return children;
}