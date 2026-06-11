import { Routes, Route } from "react-router";
import { Navigation } from "./components/Navigation";
import Dashboard from "./pages/Dashboard";
import MockTest from "./pages/MockTest";
import TestResults from "./pages/TestResults";
import StudyPlan from "./pages/StudyPlan";
import Tutor from "./pages/Tutor";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <Navigation />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/test/:sessionId?" element={<MockTest />} />
        <Route path="/results/:sessionId" element={<TestResults />} />
        <Route path="/study-plan" element={<StudyPlan />} />
        <Route path="/tutor" element={<Tutor />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
