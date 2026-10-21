import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import "../css/NavigationTransitions.css";

export default function PageTransition({ children }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const containerRef = useRef(null);
  const previousPath = useRef(location.pathname);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Restart the CSS animation without remounting pages or resetting form state.
    container.classList.remove("page-transition--enter");
    void container.offsetWidth;
    container.classList.add("page-transition--enter");

    if (previousPath.current !== location.pathname && navigationType !== "POP" && !location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    previousPath.current = location.pathname;
  }, [location.key, location.pathname, location.search, location.hash, navigationType]);

  const finishAnimation = (event) => {
    if (event.target === event.currentTarget) event.currentTarget.classList.remove("page-transition--enter");
  };

  return <div ref={containerRef} className="page-transition" onAnimationEnd={finishAnimation}>{children}</div>;
}