import React, { useState } from "react";

const ToDoForm = ({ addTask }) => {
  const [userInput, setUserInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (userInput.trim()) {
      addTask(userInput);
      setUserInput("");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={userInput}
        type="text"
        onChange={(e) => setUserInput(e.currentTarget.value)}
        placeholder="Введите задачу..."
      />
      <button>Сохранить</button>
    </form>
  );
};

export default ToDoForm;