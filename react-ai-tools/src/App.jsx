import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToolsProvider } from "./context/ToolsContext.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { ServiceBoardPage } from "./pages/ServiceBoardPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <ToolsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/service/:toolId" element={<ServiceBoardPage />} />
          </Routes>
        </BrowserRouter>
      </ToolsProvider>
    </AuthProvider>
  );
}
