import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import StoreDetails from './pages/StoreDetails.jsx';
import ShopProfilePage from './pages/ShopProfilePage.jsx';
import PriceComparisonPage from './pages/PriceComparisonPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import UserRegistrationPage from './pages/UserRegistrationPage.jsx';
import MechanicOwnerRegistrationPage from './pages/MechanicOwnerRegistrationPage.jsx';
import UserDashboardPage from './pages/UserDashboardPage.jsx';
import WriteReviewPage from './pages/WriteReviewPage.jsx';
import ReviewVerificationPage from './pages/ReviewVerificationPage.jsx';
import MechanicDashboardPage from './pages/MechanicDashboardPage.jsx';
import ShopOwnerDashboardPage from './pages/ShopOwnerDashboardPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import ManageShopInfoPage from './pages/ManageShopInfoPage.jsx';
import ManageServicesPage from './pages/ManageServicesPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />
        <Route
          path="/stores/:id"
          element={
            <Layout>
              <StoreDetails />
            </Layout>
          }
        />
        <Route
          path="/search"
          element={
            <Layout>
              <SearchPage />
            </Layout>
          }
        />
        <Route
          path="/compare"
          element={
            <Layout>
              <PriceComparisonPage />
            </Layout>
          }
        />
        <Route
          path="/login"
          element={
            <Layout>
              <LoginPage />
            </Layout>
          }
        />
        <Route
          path="/register"
          element={
            <Layout>
              <UserRegistrationPage />
            </Layout>
          }
        />
        <Route
          path="/register-pro"
          element={
            <Layout>
              <MechanicOwnerRegistrationPage />
            </Layout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <UserDashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mechanic-dashboard"
          element={
            <ProtectedRoute roles={['MECHANIC']}>
              <Layout>
                <MechanicDashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/shop-dashboard"
          element={
            <ProtectedRoute roles={['SHOP_OWNER']}>
              <Layout>
                <ShopOwnerDashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <Layout>
                <AdminDashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/shop/:id"
          element={
            <Layout>
              <ShopProfilePage />
            </Layout>
          }
        />
        <Route
          path="/write-review"
          element={
            <ProtectedRoute>
              <Layout>
                <WriteReviewPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/verify-review/:id"
          element={
            <ProtectedRoute roles={['MECHANIC']}>
              <Layout>
                <ReviewVerificationPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-shop"
          element={
            <ProtectedRoute roles={['SHOP_OWNER']}>
              <Layout>
                <ManageShopInfoPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage-services"
          element={
            <ProtectedRoute roles={['SHOP_OWNER']}>
              <Layout>
                <ManageServicesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <Layout>
              <NotFoundPage />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
