import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthProvider";
import { ChunkLoadErrorBoundary } from "./shared/ChunkLoadErrorBoundary";
import { ToastProvider } from "./shared/toast";
import "./styles.css";

document.documentElement.classList.remove("dark");
localStorage.removeItem("erp.theme");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ChunkLoadErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ChunkLoadErrorBoundary>
  </React.StrictMode>
);
