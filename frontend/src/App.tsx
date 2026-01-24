import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { ViewList } from './pages/ViewList';
import { Parser } from './pages/Parser';
import { AsciiGenerator } from './pages/AsciiGenerator';
import { Privacy } from './pages/Privacy';
import { ConsentBanner } from './components/Terminal';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/list/:id" element={<ViewList />} />
        <Route path="/parser" element={<Parser />} />
        <Route path="/ascii" element={<AsciiGenerator />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
      <ConsentBanner />
    </BrowserRouter>
  );
}

export default App;
