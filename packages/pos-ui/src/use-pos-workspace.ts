'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  PosBillDto,
  PosBillSummaryDto,
  PosMenuProductDto,
  PosHoldBillDto,
  PosLiveAnalyticsDto,
  PosCustomerSnapshotDto,
  PosSessionDto,
  PosTableDto,
  PaymentMethod,
  AddressDto,
  BusinessSettingsDto,
  ThemeSettingsDto,
} from '@mdh/types';
import { usePosStore, flattenProducts } from './pos-store';
import { usePosSocket } from './use-pos-socket';
import { usePosOfflineSync, enqueueOfflineBill, getOfflineQueueCount } from './use-pos-offline';
import type { PosApiClient } from './pos-workspace';
import type { MenuFilter } from './pos-theme';
import { usePosToast, posErrorMessage } from './pos-toast';
import type { CustomizeExtras } from './pos-customize-modal';
import type { ManagerAction } from './pos-manager-modal';
import type { PosPrintAction } from './pos-print-modal';
import { mergeReceiptPrintSettings } from './printing/receipt-settings';
import { printKotSlip, printThermalReceipt } from './printing/print-service';
import type { ReceiptCopyType } from './printing/receipt-settings';
import type { TableStartDetails } from './pos-table-start-modal';
import { validateCheckout } from './pos-checkout-validation';
import { loadTerminalSettings } from './pos-terminal-settings';
import { playPosSound } from './pos-activity-log';

function buildInstructions(extras: CustomizeExtras): string {
  const parts: string[] = [];
  if (extras.spiceLevel) parts.push(`Spice: ${extras.spiceLevel}`);
  if (extras.extraChutney) parts.push('Extra chutney');
  if (extras.extraSambar) parts.push('Extra sambar');
  if (extras.butter) parts.push('Extra butter');
  if (extras.cheese) parts.push('Extra cheese');
  if (extras.packing) parts.push('Packing required');
  if (extras.notes.trim()) parts.push(extras.notes.trim());
  return parts.join('; ');
}

export function usePosWorkspace(api: PosApiClient, cashierName?: string) {
  const qc = useQueryClient();
  const toast = usePosToast((s) => s.show);
  const store = usePosStore();
  const {
    orderType,
    bill,
    menu,
    tables,
    selectedCategoryId,
    search,
    analytics,
    recentProductIds,
    showTables,
    setBill,
    setMenu,
    setTables,
    setAnalytics,
    setSelectedCategoryId,
    setSearch,
    setShowTables,
    addRecentProduct,
  } = store;

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptBill, setReceiptBill] = useState<PosBillDto | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [pendingCustomer, setPendingCustomer] = useState<{
    name: string;
    phone: string;
    id?: string;
  }>({ name: 'Walk-in Customer', phone: '0000000000' });
  const [guestCount, setGuestCount] = useState(2);
  const [tableStartModal, setTableStartModal] = useState<{
    tableId: string;
    tableLabel: string;
  } | null>(null);
  const [tableModalCustomerQuery, setTableModalCustomerQuery] = useState('');
  const [staffName, setStaffName] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [modeSwitchTarget, setModeSwitchTarget] = useState<typeof orderType | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [menuFilter, setMenuFilter] = useState<MenuFilter>('all');
  const [categorySearch, setCategorySearch] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [flyProduct, setFlyProduct] = useState<PosMenuProductDto | null>(null);
  const [flyRect, setFlyRect] = useState<DOMRect | null>(null);
  const [customizeProduct, setCustomizeProduct] = useState<PosMenuProductDto | null>(null);
  const [liveTime, setLiveTime] = useState<Date | null>(null);
  const [holdPanelOpen, setHoldPanelOpen] = useState(false);
  const [recentBillsOpen, setRecentBillsOpen] = useState(false);
  const [recentBillsSearch, setRecentBillsSearch] = useState('');
  const [session, setSession] = useState<PosSessionDto | null>(null);
  const [offlineCount, setOfflineCount] = useState(0);
  const [managerAction, setManagerAction] = useState<ManagerAction | null>(null);
  const [managerBill, setManagerBill] = useState<PosBillSummaryDto | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [lastReceiptBill, setLastReceiptBill] = useState<PosBillDto | null>(null);
  const [tableMode, setTableMode] = useState<'select' | 'merge' | 'transfer'>('select');
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);
  const [transferFrom, setTransferFrom] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  usePosSocket(bill?.id, (data) => {
    if (data && typeof data === 'object' && 'id' in data) {
      setBill(data as PosBillDto);
    }
  });
  usePosOfflineSync(api);

  useEffect(() => {
    setLiveTime(new Date());
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: menuData, isLoading: menuLoading } = useQuery({
    queryKey: ['pos-menu'],
    queryFn: () => api.get<{ categories: typeof menu }>('/pos/menu'),
    staleTime: 5 * 60_000,
  });

  const { data: tablesData } = useQuery({
    queryKey: ['pos-tables'],
    queryFn: () =>
      api.get<((typeof tables)[0] & { activeOrderId?: string | null })[]>('/pos/tables'),
    refetchInterval: 15_000,
  });

  const { data: analyticsData } = useQuery({
    queryKey: ['pos-analytics'],
    queryFn: () => api.get<PosLiveAnalyticsDto>('/pos/analytics/live'),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    setOfflineCount(getOfflineQueueCount());
    const t = setInterval(() => setOfflineCount(getOfflineQueueCount()), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api
      .get<PosSessionDto | null>('/pos/sessions/current')
      .then(setSession)
      .catch(() => {});
  }, [api]);

  const { data: businessSettings } = useQuery({
    queryKey: ['pos-business-settings'],
    queryFn: () => api.get<BusinessSettingsDto>('/settings/business'),
    staleTime: 60_000,
  });

  const { data: themeSettings } = useQuery({
    queryKey: ['pos-theme-settings'],
    queryFn: () => api.get<ThemeSettingsDto>('/cms/theme'),
    staleTime: 60_000,
  });

  const websiteBase =
    typeof window !== 'undefined'
      ? businessSettings?.websiteUrl ||
        process.env.NEXT_PUBLIC_WEBSITE_URL ||
        window.location.origin.replace(':3002', ':3000').replace(':3005', ':3000')
      : 'http://localhost:3000';

  const logoUrl = themeSettings?.logoUrl
    ? themeSettings.logoUrl.startsWith('http')
      ? themeSettings.logoUrl
      : `${websiteBase}${themeSettings.logoUrl.startsWith('/') ? '' : '/'}${themeSettings.logoUrl}`
    : `${websiteBase}/images/logo.png`;

  const receiptPrintSettings = useMemo(
    () => mergeReceiptPrintSettings(businessSettings, logoUrl),
    [businessSettings, logoUrl],
  );

  const printReceiptForBill = useCallback(
    async (target: PosBillDto, copyType: ReceiptCopyType = 'customer', copies?: number) => {
      setPrintLoading(true);
      try {
        await printThermalReceipt(
          {
            bill: target,
            businessName: businessSettings?.businessName ?? 'Mercy Dosa House',
            tagline: businessSettings?.tagline,
            phone: businessSettings?.phone,
            whatsapp: businessSettings?.whatsapp,
            address: businessSettings?.address,
            branchName: 'Mercy Dosa House — Tura',
            cashierName: cashierName ?? session?.cashierName,
            settings: receiptPrintSettings,
          },
          copyType,
          copies,
        );
        toast('Receipt sent to printer', 'success');
      } catch (e) {
        toast(posErrorMessage(e), 'error');
      } finally {
        setPrintLoading(false);
      }
    },
    [businessSettings, cashierName, session?.cashierName, receiptPrintSettings, toast],
  );

  const printKotForBill = useCallback(
    async (target: PosBillDto) => {
      setPrintLoading(true);
      try {
        await printKotSlip({
          bill: target,
          businessName: businessSettings?.businessName ?? 'Mercy Dosa House',
          tableLabel: target.tableLabel,
          cashierName: cashierName ?? session?.cashierName,
          paperWidth: receiptPrintSettings.paperWidth,
        });
        toast('KOT sent to printer', 'success');
      } catch (e) {
        toast(posErrorMessage(e), 'error');
      } finally {
        setPrintLoading(false);
      }
    },
    [
      businessSettings?.businessName,
      cashierName,
      session?.cashierName,
      receiptPrintSettings.paperWidth,
      toast,
    ],
  );

  const handlePrintAction = useCallback(
    async (action: PosPrintAction) => {
      const current = usePosStore.getState().bill;
      if (action === 'reprint') {
        if (!lastReceiptBill) {
          toast('No receipt to reprint', 'error');
          return;
        }
        await printReceiptForBill(lastReceiptBill, 'customer');
        return;
      }
      if (action === 'kot') {
        const target = current ?? receiptBill;
        if (!target?.items.length) {
          toast('Add items before printing KOT', 'error');
          return;
        }
        await printKotForBill(target);
        return;
      }
      const target = action === 'receipt' ? (current ?? receiptBill) : (current ?? receiptBill);
      if (!target) {
        toast('No bill to print', 'error');
        return;
      }
      if (action === 'customer-copy') {
        await printReceiptForBill(target, 'customer');
      } else if (action === 'merchant-copy') {
        await printReceiptForBill(target, 'merchant');
      } else {
        await printReceiptForBill(target, 'customer');
      }
    },
    [lastReceiptBill, receiptBill, printReceiptForBill, printKotForBill, toast],
  );

  const openPrintMenu = useCallback(() => setPrintModalOpen(true), []);

  const {
    data: holdBills,
    refetch: refetchHolds,
    isLoading: holdBillsLoading,
    isFetching: holdBillsFetching,
  } = useQuery({
    queryKey: ['pos-hold-bills'],
    queryFn: () => api.get<PosHoldBillDto[]>('/pos/hold-bills'),
    refetchInterval: holdPanelOpen ? 10_000 : 30_000,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (holdPanelOpen) refetchHolds();
  }, [holdPanelOpen, refetchHolds]);

  const {
    data: recentBills,
    isLoading: recentBillsLoading,
    refetch: refetchRecentBills,
  } = useQuery({
    queryKey: ['pos-recent-bills', recentBillsSearch, session?.id],
    queryFn: () =>
      api.get<PosBillSummaryDto[]>(
        `/pos/bills?status=SETTLED&limit=20${session?.id ? `&sessionId=${session.id}` : ''}${recentBillsSearch ? `&search=${encodeURIComponent(recentBillsSearch)}` : ''}`,
      ),
    enabled: recentBillsOpen,
  });

  const { data: customerAddresses } = useQuery({
    queryKey: ['pos-customer-addresses', pendingCustomer.id],
    queryFn: () => api.get<AddressDto[]>(`/pos/customers/${pendingCustomer.id}/addresses`),
    enabled: !!pendingCustomer.id && orderType === 'DELIVERY',
  });

  const { data: customers } = useQuery({
    queryKey: ['pos-customers', customerQuery],
    queryFn: () =>
      api.get<PosCustomerSnapshotDto[]>(
        `/pos/customers/search?q=${encodeURIComponent(customerQuery)}`,
      ),
    enabled: customerQuery.length >= 1,
  });

  const { data: tableModalCustomers } = useQuery({
    queryKey: ['pos-customers-table-modal', tableModalCustomerQuery],
    queryFn: () =>
      api.get<PosCustomerSnapshotDto[]>(
        `/pos/customers/search?q=${encodeURIComponent(tableModalCustomerQuery)}`,
      ),
    enabled: !!tableStartModal && tableModalCustomerQuery.length >= 1,
  });

  useEffect(() => {
    if (!bill) return;
    setPendingCustomer({
      name: bill.customerName,
      phone: bill.customerPhone,
      id: bill.customerId ?? undefined,
    });
    if (bill.covers) setGuestCount(bill.covers);
    if (bill.tableId) setSelectedTableId(bill.tableId);
  }, [bill?.id]);

  useEffect(() => {
    if (menuData?.categories) setMenu(menuData.categories);
  }, [menuData, setMenu]);

  useEffect(() => {
    if (tablesData) setTables(tablesData);
  }, [tablesData, setTables]);

  useEffect(() => {
    if (analyticsData) setAnalytics(analyticsData);
  }, [analyticsData, setAnalytics]);

  useEffect(() => {
    if (orderType === 'DINE_IN' && !selectedTableId) {
      setShowTables(true);
    }
  }, [orderType, selectedTableId, setShowTables]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [search, selectedCategoryId, menuFilter]);

  const getBillId = () => usePosStore.getState().bill?.id;

  const createBillPayload = useCallback(() => {
    if (bill) {
      return {
        orderType,
        tableId: orderType === 'DINE_IN' ? selectedTableId : undefined,
        customerName: bill.customerName,
        customerPhone: bill.customerPhone,
        customerId: bill.customerId ?? undefined,
      };
    }
    return {
      orderType,
      tableId: orderType === 'DINE_IN' ? selectedTableId : undefined,
      customerName: pendingCustomer.name,
      customerPhone: pendingCustomer.phone,
      customerId: pendingCustomer.id,
      covers: orderType === 'DINE_IN' ? guestCount : undefined,
    };
  }, [bill, pendingCustomer, orderType, selectedTableId, guestCount]);

  const createBill = useMutation({
    mutationFn: () => api.post<PosBillDto>('/pos/bills', createBillPayload()),
    onSuccess: (b) => {
      setBill(b);
      if (b.covers) setGuestCount(b.covers);
      toast(`Bill #${b.orderNumber} created`, 'success');
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
    },
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const updateBillDetails = useMutation({
    mutationFn: ({
      billId,
      ...body
    }: {
      billId: string;
      customerName?: string;
      customerPhone?: string;
      customerId?: string | null;
      covers?: number;
      orderType?: typeof orderType;
      deliveryAddress?: string | null;
      tableId?: string | null;
    }) => api.patch<PosBillDto>(`/pos/bills/${billId}`, body),
    onSuccess: (b) => {
      setBill(b);
      if (b.covers) setGuestCount(b.covers);
    },
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const addItem = useMutation({
    mutationFn: ({
      billId,
      productId,
      specialInstructions,
    }: {
      billId: string;
      productId: string;
      specialInstructions?: string;
    }) =>
      api.post<PosBillDto>(`/pos/bills/${billId}/items`, {
        productId,
        specialInstructions,
      }),
    onSuccess: (b) => {
      setBill(b);
      qc.invalidateQueries({ queryKey: ['pos-analytics'] });
    },
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const updateItem = useMutation({
    mutationFn: ({
      billId,
      itemId,
      quantity,
      specialInstructions,
    }: {
      billId: string;
      itemId: string;
      quantity?: number;
      specialInstructions?: string;
    }) =>
      api.patch<PosBillDto>(`/pos/bills/${billId}/items/${itemId}`, {
        quantity,
        specialInstructions,
      }),
    onSuccess: setBill,
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const removeItem = useMutation({
    mutationFn: ({ billId, itemId }: { billId: string; itemId: string }) =>
      api.delete<PosBillDto>(`/pos/bills/${billId}/items/${itemId}`),
    onSuccess: setBill,
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const settle = useMutation({
    mutationFn: (data: {
      paymentMethod: PaymentMethod;
      paymentLines?: { method: PaymentMethod; amount: number; reference?: string }[];
    }) => {
      const billId = getBillId();
      if (!billId) throw new Error('No bill');
      return api.post<PosBillDto>(`/pos/bills/${billId}/settle`, data);
    },
    onSuccess: async (b) => {
      setReceiptBill(b);
      setLastReceiptBill(b);
      setBill(null);
      setSelectedTableId(null);
      toast(`Payment received · ${b.orderNumber}`, 'success');
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
      qc.invalidateQueries({ queryKey: ['pos-analytics'] });
      if (receiptPrintSettings.autoPrintPayment) {
        await printReceiptForBill(b, 'customer');
      }
    },
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const holdBill = useMutation({
    mutationFn: () => {
      const billId = getBillId();
      if (!billId) throw new Error('No bill');
      return api.post<PosBillDto>(`/pos/bills/${billId}/hold`, {});
    },
    onSuccess: () => {
      setBill(null);
      toast('Bill held successfully', 'success');
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
      qc.invalidateQueries({ queryKey: ['pos-hold-bills'] });
      refetchHolds();
    },
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const resumeBill = useMutation({
    mutationFn: (orderId: string) => api.post<PosBillDto>(`/pos/bills/${orderId}/resume`, {}),
    onSuccess: (b) => {
      setBill(b);
      if (b.tableId) setSelectedTableId(b.tableId);
      setHoldPanelOpen(false);
      toast(`Bill #${b.orderNumber} resumed`, 'success');
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
      qc.invalidateQueries({ queryKey: ['pos-hold-bills'] });
    },
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const fireKitchen = useMutation({
    mutationFn: () => {
      const billId = getBillId();
      if (!billId) throw new Error('No bill');
      return api.post<PosBillDto>(`/pos/bills/${billId}/kitchen`, {});
    },
    onSuccess: async (b) => {
      setBill(b);
      toast('Sent to kitchen (KOT)', 'success');
      if (receiptPrintSettings.autoPrintKot) {
        await printKotForBill(b);
      }
    },
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const voidBill = useMutation({
    mutationFn: ({
      billId,
      reason,
      managerPin,
    }: {
      billId: string;
      reason: string;
      managerPin: string;
    }) => api.post<PosBillDto>(`/pos/bills/${billId}/void`, { reason, managerPin }),
    onSuccess: () => {
      toast('Bill voided', 'success');
      setManagerAction(null);
      setManagerBill(null);
      refetchRecentBills();
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
    },
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const refundBill = useMutation({
    mutationFn: ({
      billId,
      reason,
      managerPin,
      amount,
    }: {
      billId: string;
      reason: string;
      managerPin: string;
      amount: number;
    }) =>
      api.post<{ success: boolean }>(`/pos/bills/${billId}/refund`, { reason, managerPin, amount }),
    onSuccess: () => {
      toast('Refund processed', 'success');
      setManagerAction(null);
      setManagerBill(null);
      refetchRecentBills();
    },
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const reorderBill = useMutation({
    mutationFn: (billId: string) => api.post<PosBillDto>(`/pos/bills/${billId}/reorder`, {}),
    onSuccess: (b) => {
      setBill(b);
      setRecentBillsOpen(false);
      toast(`Reorder · Bill #${b.orderNumber}`, 'success');
    },
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const mergeTables = useMutation({
    mutationFn: ({ tableIds, targetTableId }: { tableIds: string[]; targetTableId: string }) =>
      api.post('/pos/tables/merge', { tableIds, targetTableId }),
    onSuccess: () => {
      toast('Tables merged', 'success');
      setMergeSelection([]);
      setTableMode('select');
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
    },
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const transferTable = useMutation({
    mutationFn: ({ fromTableId, toTableId }: { fromTableId: string; toTableId: string }) =>
      api.post('/pos/tables/transfer', { fromTableId, toTableId }),
    onSuccess: () => {
      toast('Bill transferred', 'success');
      setTransferFrom(null);
      setTableMode('select');
      qc.invalidateQueries({ queryKey: ['pos-tables'] });
    },
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const applyDiscount = useMutation({
    mutationFn: () => {
      const billId = getBillId();
      if (!billId) throw new Error('No bill');
      return api.post<PosBillDto>(`/pos/bills/${billId}/discount`, {
        type: 'FLAT',
        amount: parseFloat(discountAmount) || 0,
        managerPin: managerPin || undefined,
      });
    },
    onSuccess: (b) => {
      setBill(b);
      toast('Discount applied', 'success');
    },
    onError: (e) => toast(posErrorMessage(e), 'error'),
  });

  const ensureBill = useCallback(async () => {
    const current = usePosStore.getState().bill;
    if (current) return current;

    if (orderType === 'DINE_IN' && !selectedTableId) {
      setShowTables(true);
      toast('Select a table to start dine-in order', 'info');
      throw new Error('Select a table for dine-in');
    }

    return createBill.mutateAsync();
  }, [orderType, selectedTableId, createBill, setShowTables, toast]);

  const handleAddProduct = useCallback(
    async (product: PosMenuProductDto, el?: HTMLElement, specialInstructions?: string) => {
      if (!product.isAvailable) {
        toast(`${product.name} is unavailable`, 'error');
        return;
      }
      try {
        const b = await ensureBill();
        if (el) {
          setFlyRect(el.getBoundingClientRect());
          setFlyProduct(product);
          setTimeout(() => {
            setFlyProduct(null);
            setFlyRect(null);
          }, 600);
        }
        addRecentProduct(product.id);
        const updated = await addItem.mutateAsync({
          billId: b.id,
          productId: product.id,
          specialInstructions,
        });
        setBill(updated);
        toast(`Added ${product.name}`, 'success');
        playPosSound(loadTerminalSettings().enableSound);
      } catch (e) {
        const msg = posErrorMessage(e);
        if (msg !== 'Select a table for dine-in') {
          toast(msg, 'error');
        }
        if (!navigator.onLine && bill) {
          enqueueOfflineBill({
            localId: crypto.randomUUID(),
            orderType,
            customerName: pendingCustomer.name,
            customerPhone: pendingCustomer.phone,
            items: [{ productId: product.id, quantity: 1 }],
          });
          setOfflineCount(getOfflineQueueCount());
          toast('Saved offline — will sync when online', 'info');
        }
      }
    },
    [ensureBill, addRecentProduct, addItem, setBill, toast, orderType, pendingCustomer, bill],
  );

  const handleNewBill = useCallback(async () => {
    if (orderType === 'DINE_IN' && !selectedTableId) {
      setShowTables(true);
      toast('Select a table first', 'info');
      return;
    }
    setBill(null);
    await createBill.mutateAsync();
  }, [orderType, selectedTableId, createBill, setBill, setShowTables, toast]);

  const applyOrderTypeSwitch = useCallback(
    async (mode: typeof orderType, moveBill: boolean) => {
      store.setOrderType(mode);
      if (mode === 'DINE_IN') {
        setShowTables(true);
      } else {
        setShowTables(false);
        setSelectedTableId(null);
      }

      if (moveBill) {
        const billId = getBillId();
        if (billId) {
          const updated = await updateBillDetails.mutateAsync({
            billId,
            orderType: mode,
            tableId: mode === 'DINE_IN' ? selectedTableId : null,
          });
          setBill(updated);
        }
      } else {
        setBill(null);
      }
      setModeSwitchTarget(null);
    },
    [store, setShowTables, updateBillDetails, selectedTableId, setBill],
  );

  const handleOrderTypeChange = useCallback(
    (mode: typeof orderType) => {
      if (mode === orderType) return;
      const current = usePosStore.getState().bill;
      if (current?.items.length) {
        setModeSwitchTarget(mode);
        return;
      }
      void applyOrderTypeSwitch(mode, false);
    },
    [orderType, applyOrderTypeSwitch],
  );

  const handleModeSwitchMove = useCallback(() => {
    if (modeSwitchTarget) void applyOrderTypeSwitch(modeSwitchTarget, true);
  }, [modeSwitchTarget, applyOrderTypeSwitch]);

  const handleModeSwitchHold = useCallback(async () => {
    try {
      if (bill?.items.length) await holdBill.mutateAsync();
      if (modeSwitchTarget) await applyOrderTypeSwitch(modeSwitchTarget, false);
    } catch (e) {
      toast(posErrorMessage(e), 'error');
    }
  }, [bill, holdBill, modeSwitchTarget, applyOrderTypeSwitch, toast]);

  const handleCheckout = useCallback(async () => {
    const current = usePosStore.getState().bill;
    const err = validateCheckout({
      orderType,
      bill: current,
      selectedTableId,
      deliveryAddress,
      customerPhone: pendingCustomer.phone,
      staffName,
      pickupTime,
    });
    if (err) {
      toast(err, 'error');
      return;
    }

    const billId = current?.id;
    if (billId) {
      const patch: Parameters<typeof updateBillDetails.mutateAsync>[0] = { billId };
      if (orderType === 'DELIVERY' && deliveryAddress.trim()) {
        patch.deliveryAddress = deliveryAddress.trim();
      }
      if (orderType === 'STAFF_MEAL' && staffName.trim()) {
        patch.customerName = staffName.trim();
      }
      if (Object.keys(patch).length > 1) {
        const updated = await updateBillDetails.mutateAsync(patch);
        setBill(updated);
      }
    }
    setPaymentOpen(true);
  }, [
    orderType,
    selectedTableId,
    deliveryAddress,
    pendingCustomer.phone,
    staffName,
    pickupTime,
    updateBillDetails,
    setBill,
    toast,
  ]);

  const handleClearBill = useCallback(async () => {
    const current = usePosStore.getState().bill;
    if (!current) return;
    if (!current.items.length) {
      setBill(null);
      return;
    }
    try {
      for (const item of current.items) {
        await removeItem.mutateAsync({ billId: current.id, itemId: item.id });
      }
      toast('Bill cleared', 'info');
    } catch (e) {
      toast(posErrorMessage(e), 'error');
    }
  }, [removeItem, setBill, toast]);

  const allProducts = useMemo(() => flattenProducts(menu), [menu]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return menu;
    const q = categorySearch.toLowerCase();
    return menu.filter((c) => c.name.toLowerCase().includes(q));
  }, [menu, categorySearch]);

  const displayProducts = useMemo(() => {
    let products: PosMenuProductDto[];

    switch (selectedCategoryId) {
      case '__all__':
        products = allProducts;
        break;
      case '__popular__':
        products = allProducts.filter((p) => p.isPopular);
        break;
      case '__favorites__':
        products = allProducts.filter((p) => recentProductIds.includes(p.id));
        break;
      case '__specials__':
        products = allProducts.filter((p) => p.isPopular).slice(0, 20);
        break;
      case '__new__':
        products = [...allProducts].reverse().slice(0, 20);
        break;
      default:
        products = menu.find((c) => c.id === selectedCategoryId)?.products ?? allProducts;
    }

    if (menuFilter === 'veg') products = products.filter((p) => p.foodType === 'VEG');
    if (menuFilter === 'nonveg') products = products.filter((p) => p.foodType === 'NON_VEG');
    if (menuFilter === 'popular') products = products.filter((p) => p.isPopular);
    if (menuFilter === 'available') products = products.filter((p) => p.isAvailable);

    return products;
  }, [selectedCategoryId, menu, allProducts, menuFilter, recentProductIds]);

  const selectCustomer = useCallback(
    (c: PosCustomerSnapshotDto) => {
      const patch = { name: c.name, phone: c.phone, id: c.id };
      setPendingCustomer(patch);
      const billId = getBillId();
      if (billId) {
        updateBillDetails.mutate({
          billId,
          customerName: c.name,
          customerPhone: c.phone,
          customerId: c.id,
        });
      } else if (bill) {
        setBill({ ...bill, customerName: c.name, customerPhone: c.phone, customerId: c.id });
      }
      setCustomerQuery('');
      toast(`Customer: ${c.name}`, 'success');
    },
    [bill, setBill, toast, updateBillDetails],
  );

  const handleGuestCountChange = useCallback(
    (count: number) => {
      const next = Math.max(1, Math.min(99, count));
      setGuestCount(next);
      const billId = getBillId();
      if (billId && orderType === 'DINE_IN') {
        updateBillDetails.mutate({ billId, covers: next });
      }
    },
    [orderType, updateBillDetails],
  );

  const setWalkInCustomer = useCallback(() => {
    setPendingCustomer({ name: 'Walk-in Customer', phone: '0000000000' });
    const billId = getBillId();
    if (billId) {
      updateBillDetails.mutate({
        billId,
        customerName: 'Walk-in Customer',
        customerPhone: '0000000000',
        customerId: null,
      });
    }
    setCustomerQuery('');
  }, [updateBillDetails]);

  const handleStartTableOrder = useCallback(
    async (details: TableStartDetails) => {
      setSelectedTableId(details.tableId);
      setPendingCustomer({
        name: details.customerName,
        phone: details.customerPhone,
        id: details.customerId,
      });
      setGuestCount(details.guests);
      setTableStartModal(null);
      setShowTables(false);
      setTableModalCustomerQuery('');

      const table = usePosStore.getState().tables.find((t) => t.id === details.tableId) as
        (PosTableDto & { activeOrderId?: string | null }) | undefined;

      if (table?.activeOrderId) {
        try {
          const loaded = await api.get<PosBillDto>(`/pos/bills/${table.activeOrderId}`);
          setBill(loaded);
          setPendingCustomer({
            name: loaded.customerName,
            phone: loaded.customerPhone,
            id: loaded.customerId ?? undefined,
          });
          if (loaded.covers) setGuestCount(loaded.covers);
          await updateBillDetails.mutateAsync({
            billId: loaded.id,
            customerName: details.customerName,
            customerPhone: details.customerPhone,
            customerId: details.customerId ?? null,
            covers: details.guests,
          });
          toast(`Loaded bill for ${details.tableLabel}`, 'info');
        } catch (e) {
          toast(posErrorMessage(e), 'error');
          setBill(null);
        }
      } else {
        setBill(null);
        toast(`Table ${details.tableLabel} · ${details.guests} guests`, 'success');
      }
    },
    [api, setBill, setShowTables, toast, updateBillDetails],
  );

  const handleTableSelect = useCallback(
    async (id: string) => {
      if (tableMode === 'merge') {
        setMergeSelection((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
        return;
      }
      if (tableMode === 'transfer') {
        if (!transferFrom) {
          setTransferFrom(id);
          toast('Select destination table', 'info');
          return;
        }
        if (transferFrom === id) return;
        transferTable.mutate({ fromTableId: transferFrom, toTableId: id });
        return;
      }

      const table = usePosStore.getState().tables.find((t) => t.id === id);
      if (!table) return;

      setTableStartModal({ tableId: id, tableLabel: table.label });
      const activeOrderId = (table as { activeOrderId?: string | null }).activeOrderId;
      if (activeOrderId) {
        api
          .get<PosBillDto>(`/pos/bills/${activeOrderId}`)
          .then((loaded) => {
            setPendingCustomer({
              name: loaded.customerName,
              phone: loaded.customerPhone,
              id: loaded.customerId ?? undefined,
            });
            if (loaded.covers) setGuestCount(loaded.covers);
          })
          .catch(() => {});
      }
    },
    [api, tableMode, transferFrom, transferTable, toast],
  );

  const handleMergeConfirm = useCallback(() => {
    if (mergeSelection.length < 2) {
      toast('Select at least 2 tables to merge', 'error');
      return;
    }
    const target = mergeSelection[0];
    mergeTables.mutate({ tableIds: mergeSelection, targetTableId: target });
  }, [mergeSelection, mergeTables, toast]);

  const handleUpdateQty = useCallback(
    (itemId: string, quantity: number) => {
      const billId = getBillId();
      if (!billId) return;
      updateItem.mutate({ billId, itemId, quantity });
    },
    [updateItem],
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      const billId = getBillId();
      if (!billId) return;
      removeItem.mutate({ billId, itemId });
    },
    [removeItem],
  );

  const handleItemNotes = useCallback(
    (itemId: string, specialInstructions: string) => {
      const billId = getBillId();
      if (!billId) return;
      updateItem.mutate({ billId, itemId, specialInstructions });
    },
    [updateItem],
  );

  const handleCustomizeConfirm = useCallback(
    (product: PosMenuProductDto, extras: CustomizeExtras) => {
      setCustomizeProduct(null);
      handleAddProduct(product, undefined, buildInstructions(extras));
    },
    [handleAddProduct],
  );

  const handlePrintBillById = useCallback(
    async (billId: string) => {
      setPrintLoading(true);
      try {
        const target = await api.get<PosBillDto>(`/pos/bills/${billId}`);
        await printReceiptForBill(target, 'customer');
      } catch (e) {
        toast(posErrorMessage(e), 'error');
      } finally {
        setPrintLoading(false);
      }
    },
    [api, printReceiptForBill, toast],
  );

  const handleAddHighlighted = useCallback(() => {
    const product = displayProducts[highlightIndex];
    if (product) handleAddProduct(product);
  }, [displayProducts, highlightIndex, handleAddProduct]);

  const topProductIds = useMemo(
    () => analytics?.topItems?.map((t) => t.productId) ?? [],
    [analytics?.topItems],
  );

  const handleSearchSelect = useCallback(
    async (product: PosMenuProductDto) => {
      await handleAddProduct(product);
    },
    [handleAddProduct],
  );

  /** Silently sync bill header fields to the server (auto-save). */
  const autoSaveBill = useCallback(async () => {
    const current = usePosStore.getState().bill;
    if (!current?.id || !current.items.length) return;
    if (updateBillDetails.isPending) return;
    try {
      await api.patch<PosBillDto>(`/pos/bills/${current.id}`, {
        customerName: pendingCustomer.name || current.customerName,
        customerPhone: pendingCustomer.phone || current.customerPhone,
        customerId: pendingCustomer.id ?? current.customerId ?? null,
        covers: guestCount,
        deliveryAddress: deliveryAddress || current.deliveryAddress || null,
        orderType,
      });
    } catch {
      // Auto-save failures must not interrupt the cashier
    }
  }, [api, pendingCustomer, guestCount, deliveryAddress, orderType, updateBillDetails.isPending]);

  return {
    store,
    paymentOpen,
    setPaymentOpen,
    receiptBill,
    setReceiptBill,
    customerQuery,
    setCustomerQuery,
    pendingCustomer,
    deliveryAddress,
    setDeliveryAddress,
    selectedTableId,
    setSelectedTableId,
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
    recentBillsSearch,
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
    customerAddresses,
    filteredCategories,
    displayProducts,
    allProducts,
    menuLoading,
    highlightIndex,
    setHighlightIndex,
    createBill,
    updateItem,
    removeItem,
    holdBill,
    resumeBill,
    fireKitchen,
    voidBill,
    refundBill,
    reorderBill,
    mergeTables,
    transferTable,
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
    updateBillDetails,
    tableStartModal,
    setTableStartModal,
    handleStartTableOrder,
    tableModalCustomers,
    setTableModalCustomerQuery,
    guestCount,
    handleGuestCountChange,
    setWalkInCustomer,
    staffName,
    setStaffName,
    pickupTime,
    setPickupTime,
    modeSwitchTarget,
    setModeSwitchTarget,
    handleModeSwitchMove,
    handleModeSwitchHold,
    handleCheckout,
    autoSaveBill,
  };
}
