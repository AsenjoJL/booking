import { lazy, Suspense, useEffect } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '@/components/layout/AdminLayout'
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuthStore } from '@/store/authStore'

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AccountPage = lazy(() => import('@/pages/AccountPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const CollectionsPage = lazy(() => import('@/pages/CollectionsPage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const OrderHistoryPage = lazy(() => import('@/pages/OrderHistoryPage'))
const OrderConfirmationPage = lazy(() => import('@/pages/OrderConfirmationPage'))
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'))
const ProductListPage = lazy(() => import('@/pages/ProductListPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'))

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading
      </div>
    </div>
  )
}

function App() {
  const initializeSession = useAuthStore((state) => state.initializeSession)

  useEffect(() => {
    void initializeSession()
  }, [initializeSession])

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/:slug" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="order-confirmation" element={<OrderConfirmationPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="account" element={<AccountPage />} />
            <Route path="orders" element={<OrderHistoryPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="inventory" element={<AdminDashboard />} />
            <Route path="catalog" element={<AdminDashboard />} />
            <Route path="orders" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
