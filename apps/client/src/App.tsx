import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import Home from "@/pages/Home";
import VoiceEnroll from "@/pages/VoiceEnroll";
import VoiceGuide from "@/pages/VoiceGuide";
import VoiceSearchSingle from "@/pages/VoiceSearchSingle";
import VoiceSearchMulti from "@/pages/VoiceSearchMulti";
import { ROUTES } from "@/constants";

function App() {
  return (
    <Routes>
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
        <Route
          path={ROUTES.NOT_FOUND}
          element={<Navigate to={ROUTES.VOICE_SEARCH_SINGLE} replace />}
        />
      </Route>
    </Routes>
  );
}

export default App;
