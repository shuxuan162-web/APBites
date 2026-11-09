import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from './components/ui';
import { StudentShell, VendorShell } from './components/layout';
import { useDb } from './store/db';
import { tickSimulation } from './services/api';

import Splash from './pages/auth/Splash';
import Onboarding from './pages/auth/Onboarding';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';

import Home from './pages/student/Home';
import Explore from './pages/student/Explore';
import StallDetail from './pages/student/StallDetail';
import FoodDetail from './pages/student/FoodDetail';
import Search from './pages/student/Search';
import Cart from './pages/student/Cart';
import Checkout from './pages/student/Checkout';
import OrderPlaced from './pages/student/OrderPlaced';
import TrackOrder from './pages/student/TrackOrder';
import LiveStatus from './pages/student/LiveStatus';
import Orders from './pages/student/Orders';
import OrderDetails from './pages/student/OrderDetails';
import Favourites from './pages/student/Favourites';
import Notifications from './pages/student/Notifications';
import Profile from './pages/student/Profile';
import EditProfile from './pages/student/EditProfile';
import Help from './pages/student/Help';
import About from './pages/student/About';
import Legal from './pages/student/Legal';

const DevPanel = lazy(() => import('./pages/DevPanel'));
const VendorDashboard = lazy(() => import('./pages/vendor/Dashboard'));
const VendorOrders = lazy(() => import('./pages/vendor/IncomingOrders'));
const VendorMenu = lazy(() => import('./pages/vendor/MenuManagement'));
const VendorStatus = lazy(() => import('./pages/vendor/StatusManagement'));
const VendorHistory = lazy(() => import('./pages/vendor/History'));
const VendorSettings = lazy(() => import('./pages/vendor/Settings'));

function PageLoader() {
  return <div className="flex min-h-[50vh] items-center justify-center" aria-label="Loading"><span className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand border-t-ink" /></div>;
}

/** Optional simulated traffic (developer toggle). Clearly labelled as demo data in the UI. */
function SimulationTicker() {
  const on = useDb((s) => s.simulation);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(tickSimulation, 20000);
    return () => clearInterval(t);
  }, [on]);
  return null;
}

export default function App() {
  return (
    <>
      <SimulationTicker />
      <Toaster />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/privacy" element={<Legal kind="privacy" />} />
        <Route path="/terms" element={<Legal kind="terms" />} />
        <Route path="/dev" element={<DevPanel />} />

        <Route element={<StudentShell />}>
          <Route path="/home" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/live" element={<LiveStatus />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route element={<StudentShell nav={false} />}>
          <Route path="/stall/:id" element={<StallDetail />} />
          <Route path="/food/:id" element={<FoodDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-placed/:id" element={<OrderPlaced />} />
          <Route path="/track/:id" element={<TrackOrder />} />
          <Route path="/orders/:id" element={<OrderDetails />} />
          <Route path="/favourites" element={<Favourites />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/help" element={<Help />} />
          <Route path="/about" element={<About />} />
        </Route>

        <Route path="/vendor" element={<VendorShell />}>
          <Route index element={<VendorDashboard />} />
          <Route path="orders" element={<VendorOrders />} />
          <Route path="menu" element={<VendorMenu />} />
          <Route path="status" element={<VendorStatus />} />
          <Route path="history" element={<VendorHistory />} />
          <Route path="settings" element={<VendorSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}
