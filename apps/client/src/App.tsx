import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "@/pages/Home";
import Login from "@/pages/Login";

import VoiceEnroll from "@/pages/VoiceEnroll";
import VoiceGuide from "@/pages/VoiceGuide";
import VoiceSearchSingle from "@/pages/VoiceSearchSingle";
import VoiceSearchMulti from "@/pages/VoiceSearchMulti";
import { ROUTES } from "@/constants";

function App() {
  return (
    <Routes>
      {/* ─── Auth routes (no sidebar, no header) ──────────────────── */}
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.LOGIN} element={<Login />} />
      </Route>

      {/* ─── Protected routes (requires authentication) ───────────── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path={ROUTES.HOME} element={<Home />} />
          <Route
            path={ROUTES.VOICE}
            element={<Navigate to={ROUTES.VOICE_SEARCH_SINGLE} replace />}
          />
          <Route path={ROUTES.VOICE_ENROLL} element={<VoiceEnroll />} />
          <Route
            path={ROUTES.VOICE_SEARCH_SINGLE}
            element={<VoiceSearchSingle />}
          />
          <Route
            path={ROUTES.VOICE_SEARCH_MULTI}
            element={<VoiceSearchMulti />}
          />
          <Route path={ROUTES.VOICE_GUIDE} element={<VoiceGuide />} />
        </Route>
      </Route>

      {/* ─── Catch-all → login ────────────────────────────────────── */}
      <Route
        path={ROUTES.NOT_FOUND}
        element={<Navigate to={ROUTES.LOGIN} replace />}
      />
    </Routes>
  );
}

export default App;
