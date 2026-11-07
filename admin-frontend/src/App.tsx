import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/data';
import { useAuth } from '@/lib/auth';
import type { Permission } from '@/lib/permissions';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Orders = lazy(() => import('@/pages/orders/Orders'));
const OrderDetail = lazy(() => import('@/pages/orders/OrderDetail'));
const Products = lazy(() => import('@/pages/products/Products'));
const ProductEditor = lazy(() => import('@/pages/products/ProductEditor'));
const Lookups = lazy(() => import('@/pages/products/Lookups'));
const Inventory = lazy(() => import('@/pages/inventory/Inventory'));
const Receipts = lazy(() => import('@/pages/inventory/Receipts'));
const ReceiptEditor = lazy(() => import('@/pages/inventory/ReceiptEditor'));
const Customers = lazy(() => import('@/pages/people/Customers'));
const CustomerDetail = lazy(() => import('@/pages/people/CustomerDetail'));
const Reviews = lazy(() => import('@/pages/people/Reviews'));
const Reports = lazy(() => import('@/pages/Reports'));
const Audit = lazy(() => import('@/pages/Audit'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const Invoice = lazy(() => import('@/pages/orders/Invoice'));

const Loading = () => (
  <div className="space-y-4 p-2">
    <Skeleton className="h-8 w-56" />
    <Skeleton className="h-64 w-full" />
  </div>
);

function Guard({ permission, children }: { permission?: Permission; children: ReactNode }) {
  const { me, loading, can } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (permission && !can(permission)) {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <h1 className="text-xl font-bold">You do not have access to this page</h1>
        <p className="mt-2 text-sm text-muted">Ask the owner if you need it.</p>
      </div>
    );
  }
  return <>{children}</>;
}

const NotFound = () => (
  <div className="mx-auto mt-20 max-w-md text-center">
    <p className="text-5xl font-bold text-primary">404</p>
    <h1 className="mt-2 text-xl font-bold">Page not found</h1>
  </div>
);

export function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/orders/:id/invoice"
            element={
              <Guard permission="orders.view">
                <Invoice />
              </Guard>
            }
          />
          <Route
            element={
              <Guard>
                <AppShell />
              </Guard>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Guard permission="orders.view"><Orders /></Guard>} />
            <Route path="orders/:id" element={<Guard permission="orders.view"><OrderDetail /></Guard>} />
            <Route path="customers" element={<Guard permission="customers.view"><Customers /></Guard>} />
            <Route path="customers/:id" element={<Guard permission="customers.view"><CustomerDetail /></Guard>} />
            <Route path="reviews" element={<Guard permission="reviews.view"><Reviews /></Guard>} />
            <Route path="products" element={<Guard permission="catalog.view"><Products /></Guard>} />
            <Route path="products/new" element={<Guard permission="catalog.write"><ProductEditor /></Guard>} />
            <Route path="products/:id" element={<Guard permission="catalog.view"><ProductEditor /></Guard>} />
            <Route path="categories" element={<Guard permission="catalog.view"><Lookups /></Guard>} />
            <Route path="inventory" element={<Guard permission="inventory.view"><Inventory /></Guard>} />
            <Route path="receipts" element={<Guard permission="inventory.view"><Receipts /></Guard>} />
            <Route path="receipts/new" element={<Guard permission="inventory.receive"><ReceiptEditor /></Guard>} />
            <Route path="receipts/:id" element={<Guard permission="inventory.view"><ReceiptEditor /></Guard>} />
            <Route path="reports" element={<Guard permission="reports.view"><Reports /></Guard>} />
            <Route path="audit" element={<Guard permission="audit.view"><Audit /></Guard>} />
            <Route path="settings" element={<Guard permission="settings.manage"><SettingsPage /></Guard>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
