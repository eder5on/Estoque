import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import ProductForm from "@/pages/ProductForm";
import ProductDetail from "@/pages/ProductDetail";
import Inventory from "@/pages/Inventory";
import PrivateRoute from "@/components/PrivateRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        <Route path="/products" element={
          <PrivateRoute>
            <Products />
          </PrivateRoute>
        } />
        <Route path="/products/new" element={
          <PrivateRoute>
            <ProductForm />
          </PrivateRoute>
        } />
        <Route path="/products/:id" element={
          <PrivateRoute>
            <ProductDetail />
          </PrivateRoute>
        } />
        <Route path="/products/:id/edit" element={
          <PrivateRoute>
            <ProductForm />
          </PrivateRoute>
        } />
        <Route path="/inventory" element={
          <PrivateRoute>
            <Inventory />
          </PrivateRoute>
        } />
        
        <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
      </Routes>
    </Router>
  );
}
