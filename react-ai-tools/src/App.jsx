import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToolsProvider } from "./context/ToolsContext.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { ServiceBoardPage } from "./pages/ServiceBoardPage.jsx";
import { Navigate } from "react-router-dom";
import { AdminSettingsPage } from "./pages/AdminSettingsPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <ToolsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/service/:toolId" element={<ServiceBoardPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/users" element={<Navigate to="/admin/settings" replace />} />
          </Routes>
        </BrowserRouter>
      </ToolsProvider>
    </AuthProvider>
  );
}
