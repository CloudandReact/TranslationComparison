import React from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import CompareTranslate from "./CompareTranslate";
import Translator from "./Translator";
import "./App.css"; // Ensure CSS is imported

const App = () => {
  return (
    <Router>
      <div>
        <nav className="navbar">
          <ul>
            <li>
              <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
            </li>
            <li>
              <Link to="/compare-translate" style={{ color: 'white', textDecoration: 'none' }}>Compare Translate</Link>
            </li>
          </ul>
        </nav>
        <Routes>
          <Route path="/compare-translate" element={<CompareTranslate />} />
          <Route path="/" element={<Translator />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;