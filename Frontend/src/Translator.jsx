import OpenAI from "openai";
import { BeatLoader } from "react-spinners";
import axios from "axios";
import React, { useState } from "react";
const Translator = () => {
  const [formData, setFormData] = useState({
    modelChoice: "gpt-3.5-turbo",
    temperatureValue: 0.3,
    language: "french",
    message: "",
    synthesize: false,
  });
  const [error, setError] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [translation, setTranslation] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    console.log(formData);
    setError("");
  };

  const translateBackend = async () => {
    // how do I keep a history backend of all text translated hmm keep context going each different
    try {
      console.log("sent form request");
      const res = await axios.post(
        "https://translatorbackend.onrender.com/translate",
        formData
      );
      console.log("getting response");
      console.log(res);
      console.log(res.data.translate);
      setIsLoading(false);
      setTranslation(res.data.translate);
    } catch (err) {
      console.log(err);
      setError(true);
    }
  };

  const handleOnSubmit = (e) => {
    e.preventDefault();
    if (!formData.message) {
      setError("Please enter the message.");
      return;
    }
    setIsLoading(true);
    //translate();
    translateBackend();
  };

  const handleCopy = () => {
    navigator.clipboard
      .writeText(translation)
      .then(() => displayNotification())
      .catch((err) => console.error("failed to copy: ", err));
  };

  const displayNotification = () => {
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  return (
    <div className="container">
      <h1>Translation</h1>

      <form onSubmit={handleOnSubmit}>
        <div className="modelChoices">
          <input
            type="radio"
            id="gpt-3.5-turbo"
            name="modelChoice"
            value="gpt-3.5-turbo"
            defaultChecked={formData.modelChoice}
            onChange={handleInputChange}
          />
          <label htmlFor="gpt-3.5-turbo">gpt-3.5</label>
          <input
            type="radio"
            id="gpt-4o"
            name="modelChoice"
            value="gpt-4o"
            onChange={handleInputChange}
          />
          <label htmlFor="gpt-4o">gpt-4o</label>

          <input
            type="radio"
            id="claude-3-sonnet"
            name="modelChoice"
            value="claude-3-sonnet-20240229"
            onChange={handleInputChange}
          />
          <label htmlFor="claude-3-sonnet">cl-3-sonnet</label>
          <input
            type="radio"
            id="claude-3.5-sonnet"
            name="modelChoice"
            value="claude-3-5-sonnet-20240620"
            onChange={handleInputChange}
          />
          <label htmlFor="claude-3.5-sonnet">cl-3.5-sonn</label>
          <input
            type="radio"
            id="deeplTr"
            name="modelChoice"
            value="deepl"
            onChange={handleInputChange}
          />
          <label htmlFor="deeplTr">deepl</label>
        </div>
        <div className="temperatureChoices">
          <input
            type="radio"
            id="serious"
            name="temperatureValue"
            value="0.3"
            defaultChecked={formData.temperatureValue}
            onChange={handleInputChange}
          />
          <label htmlFor="serious">Serious</label>

          <input
            type="radio"
            id="mild"
            name="temperatureValue"
            value="0.9"
            onChange={handleInputChange}
          />
          <label htmlFor="mild">Mild</label>
        </div>

        <div className="choices">
          <label htmlFor="language">Translate to</label>
          <select
            id="language"
            name="language"
            onChange={handleInputChange}
            defaultValue={formData.language}
          >
            <option value="french">French</option>
            <option value="spanish">Spanish</option>
            <option value="italian">Italian</option>
            <option value="mandarin">Mandarin</option>
            <option value="hindi">Hindi</option>
            <option value="arabic">Arabic</option>
          </select>
        </div>

        <textarea
          name="message"
          placeholder="Type your message here.."
          onChange={handleInputChange}
        ></textarea>

        {error && <div className="error">{error}</div>}

        <button type="submit">Translate</button>
      </form>

      <div className="translation">
        <div className="copy-btn" onClick={handleCopy}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
            />
          </svg>
        </div>
        {isLoading ? <BeatLoader size={12} color={"red"} /> : translation}
      </div>

      <div className={`notification ${showNotification ? "active" : ""}`}>
        Copied to clipboard!
      </div>
    </div>
  );
};

export default Translator;
