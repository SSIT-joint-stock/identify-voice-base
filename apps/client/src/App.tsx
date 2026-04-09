import { Navigate, Route, Routes } from "react-router-dom";
import { AuthSessionHandler } from "@/components/AuthSessionHandler";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ROUTES } from "@/constants";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MainLayout } from "@/layouts/MainLayout";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import VoiceEnroll from "@/pages/VoiceEnroll";
import VoiceGuide from "@/pages/VoiceGuide";
import VoiceSearchMulti from "@/pages/VoiceSearchMulti";
import VoiceSearchSingle from "@/pages/VoiceSearchSingle";

function App() {
  return (
    <>
      <AuthSessionHandler />

      <Routes>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.LOGIN} element={<Login />} />
        </Route>

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

        <Route
          path={ROUTES.NOT_FOUND}
          element={<Navigate to={ROUTES.LOGIN} replace />}
        />
      </Routes>
    </>
  );
}

export default App;
