import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Vendors from "./pages/Vendors";
import NotAuthorized from "./pages/NotAuthorized";
import Admins from "./pages/Admins";
import Products from "./pages/Products";
import Schedule from "./pages/Schedule";
import Feed from "./pages/Feed";
import Faqs from "./pages/Faqs";
import Lineup from "./pages/Lineup";
import Events from "./pages/Events";
import News from "./pages/News";
import Topics from "./pages/Topics";
import Marketplace from "./pages/Marketplace";

function RequireAdmin() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <NotAuthorized />;
  return <Layout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAdmin />}>
          <Route index element={<Dashboard />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="admins" element={<Admins />} />
          <Route path="products" element={<Products />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="feed" element={<Feed />} />
          <Route path="faqs" element={<Faqs />} />
          <Route path="lineup" element={<Lineup />} />
          <Route path="events" element={<Events />} />
          <Route path="news" element={<News />} />
          <Route path="topics" element={<Topics />} />
          <Route path="marketplace" element={<Marketplace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
