import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import FraudRulesEngine from "./pages/FraudRulesEngine";
import CreateRule from "./pages/CreateRule";
import EditRule from "./pages/EditRule";
import RulePerformance from "./pages/RulePerformance";
import ClaimDetail from "./pages/ClaimDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<FraudRulesEngine />} />
          <Route path="/rules/create" element={<CreateRule />} />
          <Route path="/rules/:id/edit" element={<EditRule />} />
          <Route path="/rule-performance" element={<RulePerformance />} />
          <Route path="/claims/:id" element={<ClaimDetail />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
