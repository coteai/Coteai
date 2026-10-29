import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import ConsultantsManager from './pages/Consultants/ConsultantsManager';
import SettingsConfig from './pages/Settings/SettingsConfig';
import PlansList from './pages/Plans/PlansList';
import PricingMatrix from './pages/Pricing/PricingMatrix';
import QuotesManager from './pages/Quotes/QuotesManager';
import QuoteGenerator from './pages/Quotes/QuoteGenerator';

import { AssociationProvider } from './contexts/AssociationContext';
import { ConsultorAuthProvider } from './contexts/ConsultorAuthContext';
import { SuperAdminAuthProvider } from './contexts/SuperAdminAuthContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';

import AdminLogin from './pages/AdminPortal/AdminLogin';
import AdminGuard from './components/layout/AdminGuard';

import ConsultorLogin from './pages/ConsultorPortal/ConsultorLogin';
import ConsultorGuard from './components/layout/ConsultorGuard';
import ConsultorLayout from './components/layout/ConsultorLayout';
import ConsultorDashboard from './pages/ConsultorPortal/ConsultorDashboard';
import ConsultorVendas from './pages/ConsultorPortal/ConsultorVendas';
import ConsultorConfig from './pages/ConsultorPortal/ConsultorConfig';

import DevLogin from './pages/DevPanel/DevLogin';
import SuperAdminGuard from './components/layout/SuperAdminGuard';
import DevLayout from './components/layout/DevLayout';
import DevDashboard from './pages/DevPanel/DevDashboard';
import DevAssociations from './pages/DevPanel/DevAssociations';

function App() {
  return (
    <SuperAdminAuthProvider>
      <AssociationProvider>
        <ConsultorAuthProvider>
          <AdminAuthProvider>
            <Router>
              <Routes>
                {/* Admin Portal */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/" element={<AdminGuard />}>
                  <Route element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="quote/new" element={<QuoteGenerator />} />
                    <Route path="sales" element={<QuotesManager />} />
                    <Route path="consultants" element={<ConsultantsManager />} />
                    <Route path="config" element={<SettingsConfig />} />
                    <Route path="plans" element={<PlansList />} />
                    <Route path="pricing" element={<PricingMatrix />} />
                  </Route>
                </Route>

              {/* Consultor Portal */}
              <Route path="/consultor/login" element={<ConsultorLogin />} />
              <Route path="/consultor" element={<ConsultorGuard />}>
                <Route element={<ConsultorLayout />}>
                  <Route index element={<ConsultorDashboard />} />
                  <Route path="vendas" element={<ConsultorVendas />} />
                  <Route path="cotacao" element={<QuoteGenerator />} />
                  <Route path="config" element={<ConsultorConfig />} />
                </Route>
              </Route>

              {/* Developer Panel */}
              <Route path="/dev/login" element={<DevLogin />} />
              <Route path="/dev" element={<SuperAdminGuard />}>
                <Route element={<DevLayout />}>
                  <Route index element={<DevDashboard />} />
                  <Route path="associations" element={<DevAssociations />} />
                </Route>
              </Route>
              </Routes>
            </Router>
          </AdminAuthProvider>
        </ConsultorAuthProvider>
      </AssociationProvider>
    </SuperAdminAuthProvider>
  );
}

export default App;

