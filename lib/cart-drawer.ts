/**
 * Cart drawer open/close helpers.
 *
 * Open/close is DOM state owned by the `<dialog>` element — deliberately not
 * mirrored into React state. These are small, stable, module-scope functions
 * that look the dialog up by ID, so the permanent `openCart` handler never
 * closes over a component ref that can go stale across HMR.
 */

export const CART_DRAWER_ID = "cart-drawer";

const STANDARD_ACTIONS_READY_EVENT = "DOMContentLoaded";

let openCartActionConfigured = false;
let openCartActionRetryQueued = false;

function getCartDrawer() {
  if (typeof document === "undefined") return null;
  const drawer = document.getElementById(CART_DRAWER_ID);
  return drawer instanceof HTMLDialogElement ? drawer : null;
}

/**
 * `showModal()`, never `show()`: only the modal path gives top-layer
 * rendering, focus containment, `inert` on the background, `::backdrop`, and
 * Escape dismissal.
 */
export function openCartDrawer() {
  const drawer = getCartDrawer();
  if (!drawer || drawer.open) return;
  drawer.showModal();
}

export function closeCartDrawer() {
  getCartDrawer()?.close();
}

function configureOpenCartActionNow() {
  const openCart =
    typeof window !== "undefined" ? window.Shopify?.actions?.openCart : undefined;
  if (!openCart) return false;

  openCart.configure({ handler: async () => openCartDrawer() });
  openCartActionConfigured = true;
  return true;
}

/**
 * Registers the drawer as the handler for `window.Shopify.actions.openCart()`,
 * so Standard Actions tools, agents, and third-party components can open it.
 *
 * `openCart.configure()` has no `unconfigure()` — the handler persists for the
 * page lifetime, which is fine for a root-layout drawer.
 */
export function configureOpenCartAction() {
  if (typeof document === "undefined" || openCartActionConfigured) return;
  if (configureOpenCartActionNow()) return;
  if (openCartActionRetryQueued || document.readyState !== "loading") return;

  openCartActionRetryQueued = true;
  document.addEventListener(
    STANDARD_ACTIONS_READY_EVENT,
    () => {
      openCartActionRetryQueued = false;
      configureOpenCartAction();
    },
    { once: true },
  );
}

// Intentional module-scope call: no-ops during SSR, configures immediately when
// Standard Actions is already present, and retries once on DOMContentLoaded
// when the runtime loads after this module.
configureOpenCartAction();
