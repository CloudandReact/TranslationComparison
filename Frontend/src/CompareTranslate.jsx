import React, { useState } from "react";
import axios from "axios";
const CompareTranslate = () => {
  const [selectedModels, setSelectedModels] = useState([]);
  const [error, setError] = useState("");
  const [evaluationResults, setEvaluationResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    selectedModels: [""],
    temperatureValue: 0.3,
    language: "french",
    message: "",
    evaluationResults: {},
    synthesize: false,
  });
  // Example static models list
  const models = {
    "gpt-3.5": "gpt-3.5-turbo",
    "gpt-4o": "gpt-4o",
    "claude-3-sonnet": "claude-3-sonnet-20240229",
    "claude-3-5-sonnet": "claude-3-5-sonnet-20240620",
    deepl: "deepl",
  };

  // Handle model selection change
  const handleModelChange = (model, isChecked) => {
    let updatedModels;
    if (isChecked) {
      updatedModels = selectedModels.includes(model)
        ? [...selectedModels]
        : [...selectedModels, model];
    } else {
      updatedModels = selectedModels.filter((m) => m !== model);
    }
    setSelectedModels(updatedModels);

    //(updatedModels); // This will now log the most recently updated models list
    setFormData({
      ...formData,
      selectedModels: updatedModels,
    });
  };
  function processTranslations(translationsData, evaluatingModelName) {
    // Initial grouping and processing of translation data
    const groups = translationsData.reduce((acc, item) => {
      const evaluation = JSON.parse(item.evaluation);
      const key = item.inputText;
      if (!acc[key]) {
        acc[key] = { models: {} };
      }
      if (!acc[key].models[item.inputModel]) {
        acc[key].models[item.inputModel] = { details: [] };
      }
      acc[key].models[item.inputModel].details.push({
        score: evaluation.score,
        comment: evaluation.comment,
        translation: item.outputText, // doesnt exist
        modelName: item.inputModel, // Model that provided the translation
        evaluatingModelName: item.model, // Model that evaluated the output
      });
      return acc;
    }, {});

    // Calculate average scores and store details
    Object.values(groups).forEach((group) => {
      Object.entries(group.models).forEach(([modelName, modelData]) => {
        const totalScore = modelData.details.reduce(
          (sum, detail) => sum + detail.score,
          0
        );
        const averageScore = totalScore / modelData.details.length;
        group.models[modelName].average = averageScore;
      });
    });

    // Identify top models (up to 5) and adjust details to include model name and evaluating model name
    const sortedGroups = Object.entries(groups)
      .map(([inputText, data]) => {
        const modelsRanked = Object.entries(data.models)
          .sort((a, b) => b[1].average - a[1].average)
          .slice(0, 5) // Select up to the top 5 models
          .map(([modelName, modelData]) => ({
            modelName,
            average: modelData.average,
            details: modelData.details.map((detail) => ({
              ...detail,
              modelName: modelName, // Ensure model name is included in each detail
              evaluatingModelName: evaluatingModelName, // Include evaluating model name in each detail
            })),
          }));

        return { inputText, models: modelsRanked };
      })
      .sort((a, b) => b.models[0].average - a.models[0].average);

    // Example of how you might use sortedGroups for further processing or output
    console.log(sortedGroups);
    return sortedGroups;
  }

  const CompareTranslateResponses = async () => {
    // how do I keep a history backend of all text translated hmm keep context going each different
    try {
      //console.log("sent form request");      
      //http://localhost:8800/compareTranslate      
      const res = await axios.post(
        "https://translatorbackend.onrender.com/compareTranslate ",
        formData
      );     
      const translationsData = res.data.validatedTranslations;     
      const processedData = await processTranslations(translationsData);
      setEvaluationResults(processedData);
      setIsLoading(false);     
    } catch (err) {
      console.log(err);
      setError(true);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.name !== "selectedModels") {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    } else {
      setFormData({
        ...formData,
        selectedModels: selectedModels,
      });
    }

   
    setError("");
  };

  // Handle text input change

  // Define onSubmit logic directly inside the component
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.message) {
      setError("Please enter the message.");
      return;
    }
    // Example onSubmit logic
    const results = `Submitted text: ${
      formData.message
    } with models: ${selectedModels.join(", ")}`;
    setFormData;
    
    CompareTranslateResponses();
  };

  return (
    <div className="container">
      <h1>Compare Translations</h1>

      <form onSubmit={handleSubmit}>
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
          className="translateText"
          name="message"
          onChange={handleInputChange}
          placeholder="Enter text to translate"
        />
        <div className="modelChoices">
          {Object.entries(models).map(([key, value]) => (
            <div key={key}>
              <input
                type="checkbox"
                id={key}
                name={key}
                value={value}
                onChange={(e) => handleModelChange(value, e.target.checked)}
              />
              <label htmlFor={key}>{key}</label>
            </div>
          ))}
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit" className="submitButton">
          Evaluate
        </button>
      </form>
      {evaluationResults.length > 0 && (
        <div className="results">
          <table>
            <thead>
              <tr>
                <th>Input Text</th>
                <th>Model Name</th>
                <th>Avg Score /10</th>
                <th>Translation</th>
              </tr>
            </thead>
            <tbody>
              {evaluationResults.map((result, index) =>
                result.models.map((model, modelIndex) => (
                  <React.Fragment key={modelIndex}>
                    {model.details.map((detail, detailIndex) => (
                      <tr key={detailIndex}>
                        {detailIndex === 0 && (
                          <td rowSpan={model.details.length}>
                            {result.inputText}
                          </td>
                        )}
                        {detailIndex === 0 && (
                          <td rowSpan={model.details.length}>
                            {model.modelName}
                          </td>
                        )}
                        {detailIndex === 0 && (
                          <td rowSpan={model.details.length}>
                            {model.average}
                          </td>
                        )}
                        {detailIndex === 0 && (
                          <td rowSpan={model.details.length}>
                            {detail.translation}
                          </td>
                        )}
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CompareTranslate;
