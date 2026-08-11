'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, cn } from '@mdh/ui';
import { login } from '@mdh/auth-client';
import { formatCurrency } from '@mdh/utils';
import { PosTopNav } from './pos-top-nav';
import { PosModeBar } from './pos-mode-bar';
import { PosStatsBar } from './pos-stats-bar';
import { PosCategorySidebar } from './pos-category-sidebar';
import { PosMenuGrid } from './pos-menu-grid';
import { PosBillPanel } from './pos-bill-panel';
import { PosBottomBar } from './pos-bottom-bar';
import { PosTableFloor } from './pos-table-floor';
import { PosCustomizeModal } from './pos-customize-modal';
import { PosFlyToCart } from './pos-fly-to-cart';
import { PosPaymentModal } from './pos-payment-modal';
import { PosHoldPanel } from './pos-hold-panel';
import { PosRecentBillsPanel } from './pos-recent-bills-panel';
import { PosManagerModal } from './pos-manager-modal';
import { PosPrintModal } from './pos-print-modal';
import { PosModeSwitchModal } from './pos-mode-switch-modal';
import { PosTableStartModal } from './pos-table-start-modal';
import { PosSettingsModal } from './pos-settings-modal';
import { PosLogoutModal } from './pos-logout-modal';
import { PosLockScreen } from './pos-lock-screen';
import { PosAppLauncher } from './pos-app-launcher';
import { POS_ADMIN_LINKS, openAdminLink } from './pos-admin-links';
import { PosRestaurantClosedBanner } from './pos-restaurant-closed-banner';
import { ThermalReceiptPreview } from './thermal-receipt-preview';
import {
  loadTerminalSettings,
  saveTerminalSettings,
  resetTerminalSettings,
  type PosTerminalSettings,
} from './pos-terminal-settings';
import { logPosActivity, playPosSound } from './pos-activity-log';
import { logout as authLogout } from '@mdh/auth-client';
import { PosToastHost } from './pos-toast';
import { usePosWorkspace } from './use-pos-workspace';
import { POS_THEME } from './pos-theme';
import { Copy, Printer, ShoppingCart, X } from 'lucide-react';

export interface PosApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

export interface PosWorkspaceProps {
  api: PosApiClient;
  apiBaseUrl?: string;
  /** Admin app origin for launcher links, e.g. http://localhost:3002. Empty = same origin. */
  adminBaseUrl?: string;
  /** Path to POS within admin, used for "Return to POS" links. */
  posPath?: string;
  isManager?: boolean;
  cashierName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

export function PosWorkspace({
  api,
  apiBaseUrl,
  adminBaseUrl = '',
  posPath = '/pos',
  isManager = false,
  cashierName,
  userEmail,
  onLogout,
}: PosWorkspaceProps) {
  const ws = usePosWorkspace(api, cashierName);
  const {
    store,
    paymentOpen,
    setPaymentOpen,
    receiptBill,
    setReceiptBill,
    customerQuery,
    setCustomerQuery,
    deliveryAddress,
    setDeliveryAddress,
    customerAddresses,
    selectedTableId,
    discountAmount,
    setDiscountAmount,
    managerPin,
    setManagerPin,
    menuFilter,
    setMenuFilter,
    categorySearch,
    setCategorySearch,
    sidebarCollapsed,
    setSidebarCollapsed,
    flyProduct,
    flyRect,
    customizeProduct,
    setCustomizeProduct,
    liveTime,
    customers,
    holdBills,
    holdBillsLoading,
    holdBillsFetching,
    holdPanelOpen,
    setHoldPanelOpen,
    recentBillsOpen,
    setRecentBillsOpen,
    setRecentBillsSearch,
    recentBills,
    recentBillsLoading,
    session,
    offlineCount,
    managerAction,
    setManagerAction,
    managerBill,
    setManagerBill,
    tableMode,
    setTableMode,
    mergeSelection,
    transferFrom,
    filteredCategories,
    displayProducts,
    menuLoading,
    highlightIndex,
    setHighlightIndex,
    holdBill,
    resumeBill,
    fireKitchen,
    voidBill,
    refundBill,
    reorderBill,
    applyDiscount,
    settle,
    handleAddProduct,
    handleNewBill,
    handleClearBill,
    handleOrderTypeChange,
    selectCustomer,
    handleTableSelect,
    handleMergeConfirm,
    handleUpdateQty,
    handleRemoveItem,
    handleItemNotes,
    handleCustomizeConfirm,
    handleAddHighlighted,
    showTables,
    setShowTables,
    setSelectedCategoryId,
    setSearch,
    analytics,
    search,
    printModalOpen,
    setPrintModalOpen,
    printLoading,
    lastReceiptBill,
    receiptPrintSettings,
    businessSettings,
    handlePrintAction,
    openPrintMenu,
    printReceiptForBill,
    handlePrintBillById,
    topProductIds,
    handleSearchSelect,
    allProducts,
    tableStartModal,
    setTableStartModal,
    handleStartTableOrder,
    tableModalCustomers,
    setTableModalCustomerQuery,
    guestCount,
    handleGuestCountChange,
    pendingCustomer,
    setWalkInCustomer,
    handleModeSwitchMove,
    handleModeSwitchHold,
    handleCheckout,
    autoSaveBill,
    modeSwitchTarget,
    setModeSwitchTarget,
    staffName,
    setStaffName,
    pickupTime,
    setPickupTime,
  } = ws;

  const {
    orderType,
    bill,
    menu,
    tables,
    selectedCategoryId,
    darkMode,
    toggleDarkMode,
    recentProductIds,
  } = store;

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [mobileBillOpen, setMobileBillOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [terminalSettings, setTerminalSettings] = useState<PosTerminalSettings>(() =>
    typeof window !== 'undefined' ? loadTerminalSettings() : loadTerminalSettings(),
  );

  const openBillsCount = (bill?.items.length ? 1 : 0) + (holdBills?.length ?? 0);
  const unsavedBillsCount = bill?.items.length ? 1 : 0;
  const billItemCount = bill?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
    setLauncherOpen(false);
    void logPosActivity(api, 'POS_SETTINGS_OPENED');
  }, [api]);

  const handleLauncherAction = useCallback(
    (action: 'settings' | 'exit-pos') => {
      if (action === 'settings') {
        openSettings();
      } else {
        setLogoutOpen(true);
      }
    },
    [openSettings],
  );

  const openAdminModuleByHotkey = useCallback(
    (hotkey: string) => {
      const link = POS_ADMIN_LINKS.find((l) => l.hotkey === hotkey);
      if (!link?.href) return;
      openAdminLink(adminBaseUrl, link);
    },
    [adminBaseUrl],
  );

  const handleSaveSettings = useCallback(
    async (next: PosTerminalSettings) => {
      saveTerminalSettings(next);
      setTerminalSettings(next);
      if (next.enableDarkMode !== darkMode) toggleDarkMode();
      if (next.enableFullscreen && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => undefined);
      }
      if (isManager) {
        await api.patch('/settings/business', {
          receiptFooterMessage: next.receiptFooterMessage,
          receiptPaperWidth: next.receiptPaperWidth,
          receiptShowQr: next.receiptShowQr,
          receiptAutoPrintPayment: next.autoPrintPayment,
          receiptAutoPrintKot: next.autoPrintKot,
          receiptFontSize: next.fontSize,
          deliveryCharge: next.deliveryCharge,
        });
      }
      await logPosActivity(api, 'POS_SETTINGS_UPDATED', { terminal: next.terminalName });
    },
    [api, darkMode, toggleDarkMode, isManager],
  );

  const handleLock = useCallback(() => {
    setLocked(true);
    setSettingsOpen(false);
    void logPosActivity(api, 'POS_LOCK');
  }, [api]);

  const handleUnlock = useCallback(
    async (password: string) => {
      if (!apiBaseUrl || !userEmail) return false;
      try {
        await login(apiBaseUrl, { email: userEmail, password });
        setLocked(false);
        void logPosActivity(api, 'POS_UNLOCK');
        return true;
      } catch {
        void logPosActivity(api, 'POS_UNLOCK_FAILED');
        return false;
      }
    },
    [api, apiBaseUrl, userEmail],
  );

  const performLogout = useCallback(async () => {
    try {
      await logPosActivity(api, 'POS_LOGOUT');
      if (apiBaseUrl) await authLogout(apiBaseUrl);
      onLogout?.();
    } catch (e) {
      void logPosActivity(api, 'POS_LOGOUT_FAILED');
      throw e;
    }
  }, [api, apiBaseUrl, onLogout]);

  const handleLogoutAnyway = useCallback(
    async (managerPin?: string) => {
      if (managerPin) {
        await api.post('/pos/security/verify-pin', { pin: managerPin });
      }
      await performLogout();
    },
    [api, performLogout],
  );

  const handleSaveDraftsAndClose = useCallback(() => {
    if (bill?.items.length) holdBill.mutate();
  }, [bill, holdBill]);

  const shiftLabel = session
    ? new Date(session.openedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : 'Active';

  // Auto-save active bill metadata every 5 seconds
  useEffect(() => {
    const id = window.setInterval(() => {
      void autoSaveBill();
    }, 5000);
    return () => window.clearInterval(id);
  }, [autoSaveBill]);

  // Warn before closing tab when bills are open
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (openBillsCount > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [openBillsCount]);

  useEffect(() => {
    if (!terminalSettings.enableKeyboardShortcuts) return;

    function onKey(e: KeyboardEvent) {
      const inInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      if (e.key === 'ArrowDown' && !inInput) {
        e.preventDefault();
        setHighlightIndex(Math.min(highlightIndex + 1, displayProducts.length - 1));
        return;
      }
      if (e.key === 'ArrowUp' && !inInput) {
        e.preventDefault();
        setHighlightIndex(Math.max(highlightIndex - 1, 0));
        return;
      }
      if (e.key === 'Enter' && !inInput && displayProducts.length) {
        e.preventDefault();
        handleAddHighlighted();
        return;
      }
      if (e.key === 'Delete' && bill?.items.length && !inInput) {
        const last = bill.items[bill.items.length - 1];
        if (last) handleRemoveItem(last.id);
        return;
      }
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.ctrlKey && e.altKey && !e.shiftKey) {
        const key = e.key.toLowerCase();
        if (key === 'a') {
          e.preventDefault();
          setLauncherOpen((o) => !o);
          return;
        }
        if (['h', 'm', 'o', 'k', 'r'].includes(key)) {
          e.preventDefault();
          openAdminModuleByHotkey(key);
          return;
        }
        if (key === 'p') {
          e.preventDefault();
          setLauncherOpen(false);
          return;
        }
      }

      if (inInput && !(e.key === 'Escape' && (settingsOpen || launcherOpen))) return;

      if (e.key === 'Escape' && launcherOpen) {
        e.preventDefault();
        setLauncherOpen(false);
        return;
      }

      if (e.key === 'Escape' && settingsOpen) {
        e.preventDefault();
        setSettingsOpen(false);
        return;
      }

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setLogoutOpen(true);
        return;
      }
      if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        handleLock();
        return;
      }

      if (inInput) return;

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          openSettings();
          break;
        case 'F2':
          e.preventDefault();
          if (bill?.items.length) holdBill.mutate();
          break;
        case 'F3':
          e.preventDefault();
          setHoldPanelOpen(true);
          break;
        case 'F4':
          e.preventDefault();
          if (isManager)
            document.querySelector<HTMLInputElement>('input[placeholder*="Discount"]')?.focus();
          break;
        case 'F5':
          e.preventDefault();
          if (bill?.items.length) void handleCheckout();
          break;
        case 'F6':
          e.preventDefault();
          openPrintMenu();
          break;
        case 'F7':
          e.preventDefault();
          if (bill?.items.length) fireKitchen.mutate();
          break;
        case 'F8':
          e.preventDefault();
          handleNewBill();
          break;
        case 'Escape':
          setCustomizeProduct(null);
          setPaymentOpen(false);
          setHoldPanelOpen(false);
          setRecentBillsOpen(false);
          setManagerAction(null);
          setPrintModalOpen(false);
          setTableStartModal(null);
          setLauncherOpen(false);
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    bill,
    holdBill,
    fireKitchen,
    handleNewBill,
    handleAddHighlighted,
    handleRemoveItem,
    setPaymentOpen,
    setCustomizeProduct,
    setHoldPanelOpen,
    setRecentBillsOpen,
    setManagerAction,
    highlightIndex,
    displayProducts.length,
    setHighlightIndex,
    isManager,
    settingsOpen,
    openSettings,
    handleLock,
    handleCheckout,
    openPrintMenu,
    terminalSettings.enableKeyboardShortcuts,
    launcherOpen,
    openAdminModuleByHotkey,
  ]);

  return (
    <div
      className={cn(
        'h-screen flex flex-col overflow-hidden',
        darkMode ? 'bg-gray-950 text-white' : 'text-gray-900',
      )}
      style={darkMode ? undefined : { background: POS_THEME.bg }}
    >
      <PosToastHost darkMode={darkMode} />
      <PosRestaurantClosedBanner api={api} />

      <PosTopNav
        cashierName={cashierName}
        shiftLabel={shiftLabel}
        offlineQueueCount={offlineCount}
        darkMode={darkMode}
        onToggleDark={toggleDarkMode}
        liveTime={liveTime}
        search={search}
        onSearchChange={setSearch}
        allProducts={allProducts}
        recentProductIds={recentProductIds}
        topProductIds={topProductIds}
        onSearchSelect={handleSearchSelect}
        searchInputRef={searchInputRef}
        online={typeof navigator !== 'undefined' ? navigator.onLine : true}
        onOpenSettings={openSettings}
        onOpenLauncher={() => setLauncherOpen(true)}
        onOpenLogout={() => setLogoutOpen(true)}
      />

      <PosModeBar orderType={orderType} onChange={handleOrderTypeChange} darkMode={darkMode} />

      <PosStatsBar analytics={analytics} darkMode={darkMode} />

      {orderType === 'DINE_IN' && showTables && (
        <PosTableFloor
          tables={tables}
          selectedId={selectedTableId}
          mode={tableMode}
          mergeSelection={mergeSelection}
          transferFrom={transferFrom}
          onSelect={handleTableSelect}
          onModeChange={setTableMode}
          onMergeConfirm={handleMergeConfirm}
          onClose={() => {
            if (!selectedTableId && tableMode === 'select') return;
            setShowTables(false);
          }}
          darkMode={darkMode}
        />
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <PosCategorySidebar
          categories={filteredCategories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
          search={categorySearch}
          onSearchChange={setCategorySearch}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          darkMode={darkMode}
        />

        <PosMenuGrid
          products={displayProducts}
          menuFilter={menuFilter}
          highlightIndex={highlightIndex}
          onFilterChange={setMenuFilter}
          onAdd={handleAddProduct}
          onCustomize={setCustomizeProduct}
          darkMode={darkMode}
          loading={menuLoading && !menu.length}
        />

        <div className="hidden lg:flex shrink-0">
          <PosBillPanel
            bill={bill}
            tables={tables}
            selectedTableId={selectedTableId}
            customerQuery={customerQuery}
            customers={customers}
            darkMode={darkMode}
            isManager={isManager}
            discountAmount={discountAmount}
            managerPin={managerPin}
            orderType={orderType}
            deliveryAddress={deliveryAddress}
            onDeliveryAddressChange={setDeliveryAddress}
            customerAddresses={customerAddresses}
            onCustomerQueryChange={setCustomerQuery}
            onSelectCustomer={selectCustomer}
            onSetWalkIn={setWalkInCustomer}
            onNewBill={handleNewBill}
            onHold={() => holdBill.mutate()}
            onClear={handleClearBill}
            onRecall={() => setHoldPanelOpen(true)}
            onRecentBills={() => setRecentBillsOpen(true)}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onItemNotes={handleItemNotes}
            onPay={() => void handleCheckout()}
            onDiscountChange={setDiscountAmount}
            onManagerPinChange={setManagerPin}
            onApplyDiscount={() => applyDiscount.mutate()}
            createPending={ws.createBill.isPending}
            holdPending={holdBill.isPending}
            guestCount={guestCount}
            onGuestCountChange={handleGuestCountChange}
            cashierName={cashierName}
            liveTime={liveTime}
            pendingCustomerName={pendingCustomer.name}
            pendingCustomerPhone={pendingCustomer.phone}
            staffName={staffName}
            onStaffNameChange={setStaffName}
            pickupTime={pickupTime}
            onPickupTimeChange={setPickupTime}
          />
        </div>
      </div>

      {/* Mobile bill bottom sheet */}
      {mobileBillOpen && (
        <div className="lg:hidden fixed inset-0 z-[200] flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close bill"
            onClick={() => setMobileBillOpen(false)}
          />
          <div className="relative z-10 flex justify-end px-3 pb-1">
            <button
              type="button"
              onClick={() => setMobileBillOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg"
              aria-label="Close bill panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <PosBillPanel
            bill={bill}
            tables={tables}
            selectedTableId={selectedTableId}
            customerQuery={customerQuery}
            customers={customers}
            darkMode={darkMode}
            isManager={isManager}
            discountAmount={discountAmount}
            managerPin={managerPin}
            orderType={orderType}
            deliveryAddress={deliveryAddress}
            onDeliveryAddressChange={setDeliveryAddress}
            customerAddresses={customerAddresses}
            onCustomerQueryChange={setCustomerQuery}
            onSelectCustomer={selectCustomer}
            onSetWalkIn={setWalkInCustomer}
            onNewBill={handleNewBill}
            onHold={() => holdBill.mutate()}
            onClear={handleClearBill}
            onRecall={() => setHoldPanelOpen(true)}
            onRecentBills={() => setRecentBillsOpen(true)}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onItemNotes={handleItemNotes}
            onPay={() => {
              setMobileBillOpen(false);
              void handleCheckout();
            }}
            onDiscountChange={setDiscountAmount}
            onManagerPinChange={setManagerPin}
            onApplyDiscount={() => applyDiscount.mutate()}
            createPending={ws.createBill.isPending}
            holdPending={holdBill.isPending}
            guestCount={guestCount}
            onGuestCountChange={handleGuestCountChange}
            cashierName={cashierName}
            liveTime={liveTime}
            pendingCustomerName={pendingCustomer.name}
            pendingCustomerPhone={pendingCustomer.phone}
            staffName={staffName}
            onStaffNameChange={setStaffName}
            pickupTime={pickupTime}
            onPickupTimeChange={setPickupTime}
            mobileMode
          />
        </div>
      )}

      {/* Mobile cart FAB */}
      <button
        type="button"
        onClick={() => setMobileBillOpen(true)}
        className={cn(
          'lg:hidden fixed bottom-20 right-4 z-[150] flex items-center gap-2 rounded-full px-4 py-3 min-h-[48px] shadow-xl font-bold text-white',
          'bg-emerald-700 hover:bg-emerald-800 active:scale-95 transition-transform',
        )}
        aria-label="Open current bill"
      >
        <ShoppingCart className="h-5 w-5" />
        Bill{billItemCount > 0 ? ` (${billItemCount})` : ''}
        {bill ? (
          <span className="text-emerald-100 text-sm font-semibold">
            {formatCurrency(bill.grandTotal)}
          </span>
        ) : null}
      </button>

      <PosBottomBar
        bill={bill}
        darkMode={darkMode}
        onSaveDraft={() => holdBill.mutate()}
        onHold={() => holdBill.mutate()}
        onPrint={openPrintMenu}
        onKot={() => fireKitchen.mutate()}
        onCoupon={() => applyDiscount.mutate()}
        onCheckout={() => void handleCheckout()}
        onMerge={() => {
          setTableMode('merge');
          setShowTables(true);
        }}
      />

      <PosFlyToCart product={flyProduct} fromRect={flyRect} />

      <PosCustomizeModal
        product={customizeProduct}
        onClose={() => setCustomizeProduct(null)}
        onConfirm={handleCustomizeConfirm}
        darkMode={darkMode}
      />

      <PosHoldPanel
        open={holdPanelOpen}
        holds={holdBills}
        loading={holdBillsLoading || holdBillsFetching}
        darkMode={darkMode}
        onClose={() => setHoldPanelOpen(false)}
        onResume={(orderId) => resumeBill.mutate(orderId)}
      />

      <PosRecentBillsPanel
        open={recentBillsOpen}
        bills={recentBills}
        loading={recentBillsLoading}
        darkMode={darkMode}
        onClose={() => setRecentBillsOpen(false)}
        onSearch={setRecentBillsSearch}
        onReorder={(id) => reorderBill.mutate(id)}
        onVoid={(b) => {
          setManagerBill(b);
          setManagerAction('void');
        }}
        onRefund={(b) => {
          setManagerBill(b);
          setManagerAction('refund');
        }}
        onPrint={handlePrintBillById}
      />

      <PosManagerModal
        open={!!managerAction && !!managerBill}
        action={managerAction ?? 'void'}
        bill={managerBill}
        darkMode={darkMode}
        loading={voidBill.isPending || refundBill.isPending}
        onClose={() => {
          setManagerAction(null);
          setManagerBill(null);
        }}
        onConfirm={({ reason, managerPin: pin, amount }) => {
          if (!managerBill) return;
          if (managerAction === 'void') {
            voidBill.mutate({ billId: managerBill.id, reason, managerPin: pin });
          } else {
            refundBill.mutate({
              billId: managerBill.id,
              reason,
              managerPin: pin,
              amount: amount ?? managerBill.grandTotal,
            });
          }
        }}
      />

      {bill && (
        <PosPaymentModal
          bill={bill}
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          onSettle={async (data) => {
            await settle.mutateAsync(data);
          }}
          allowSplit={isManager}
        />
      )}

      <PosModeSwitchModal
        open={!!modeSwitchTarget}
        fromMode={orderType}
        toMode={modeSwitchTarget ?? orderType}
        itemCount={bill?.items.length ?? 0}
        darkMode={darkMode}
        onMove={handleModeSwitchMove}
        onSaveDraft={handleModeSwitchHold}
        onCancel={() => setModeSwitchTarget(null)}
        loading={holdBill.isPending || ws.updateBillDetails.isPending}
      />

      <PosTableStartModal
        open={!!tableStartModal}
        tableId={tableStartModal?.tableId ?? ''}
        tableLabel={tableStartModal?.tableLabel ?? ''}
        cashierName={cashierName}
        darkMode={darkMode}
        customers={tableModalCustomers}
        initialCustomerName={pendingCustomer.name}
        initialCustomerPhone={pendingCustomer.phone}
        initialGuests={guestCount}
        onCustomerSearch={setTableModalCustomerQuery}
        onClose={() => {
          setTableStartModal(null);
          setTableModalCustomerQuery('');
        }}
        onStart={handleStartTableOrder}
        loading={ws.updateBillDetails.isPending}
      />

      <PosPrintModal
        open={printModalOpen}
        darkMode={darkMode}
        onClose={() => setPrintModalOpen(false)}
        onAction={handlePrintAction}
        hasLastReceipt={!!lastReceiptBill}
        hasBill={!!(bill ?? receiptBill)}
        loading={printLoading}
      />

      {receiptBill && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4">
          <div className="space-y-4 max-h-[95vh] overflow-y-auto">
            <ThermalReceiptPreview
              bill={receiptBill}
              businessName={businessSettings?.businessName ?? 'Mercy Dosa House'}
              tagline={businessSettings?.tagline}
              phone={businessSettings?.phone}
              whatsapp={businessSettings?.whatsapp}
              address={businessSettings?.address}
              branchName="Mercy Dosa House — Tura"
              cashierName={cashierName}
              settings={receiptPrintSettings}
            />
            <div className="flex gap-2 justify-center flex-wrap">
              <Button variant="outline" onClick={() => reorderBill.mutate(receiptBill.id)}>
                <Copy className="h-4 w-4 mr-1" /> Reorder
              </Button>
              <Button
                variant="outline"
                onClick={() => printReceiptForBill(receiptBill, 'customer')}
                disabled={printLoading}
              >
                <Printer className="h-4 w-4 mr-1" /> Print Receipt
              </Button>
              <Button onClick={() => setReceiptBill(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}

      <PosSettingsModal
        open={settingsOpen}
        darkMode={darkMode}
        settings={terminalSettings}
        businessSettings={businessSettings}
        cashierName={cashierName}
        branchName={terminalSettings.branch}
        previewBill={bill ?? lastReceiptBill}
        online={typeof navigator !== 'undefined' ? navigator.onLine : true}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
        onReset={() => {
          const defaults = resetTerminalSettings();
          setTerminalSettings(defaults);
        }}
        onLock={handleLock}
        onTestPrint={() => {
          const target = bill ?? lastReceiptBill;
          if (target) void printReceiptForBill(target, 'customer');
        }}
      />

      <PosAppLauncher
        open={launcherOpen}
        darkMode={darkMode}
        adminBaseUrl={adminBaseUrl}
        openBillsCount={openBillsCount}
        onClose={() => setLauncherOpen(false)}
        onAction={handleLauncherAction}
      />

      <PosLogoutModal
        open={logoutOpen}
        darkMode={darkMode}
        cashierName={cashierName}
        shiftLabel={shiftLabel}
        openBillsCount={openBillsCount}
        unsavedBillsCount={unsavedBillsCount}
        isManager={isManager}
        onClose={() => setLogoutOpen(false)}
        onContinueWorking={() => setLogoutOpen(false)}
        onSaveDrafts={handleSaveDraftsAndClose}
        onLogoutAnyway={handleLogoutAnyway}
        onLogout={performLogout}
      />

      {locked && (
        <PosLockScreen cashierName={cashierName} darkMode={darkMode} onUnlock={handleUnlock} />
      )}
    </div>
  );
}
