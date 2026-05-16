import React, { useState, useEffect } from 'react';
import './App.css';
import ToDoForm from './AddTask';
import ToDo from './Task';
import axios from 'axios';

const TASKS_STORAGE_KEY = 'tasks-list-project-web';

function App() {
  const [rates, setRates] = useState({});
  const [weatherData, setWeatherData] = useState(null);
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState(() => {
    const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
    return storedTasks ? JSON.parse(storedTasks) : [];
  });

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);

      // 1. Курс валют (ЦБ РФ)
      try {
        const currencyResponse = await axios.get(
          'https://www.cbr-xml-daily.ru/daily_json.js'
        );
        const USDrate = currencyResponse.data.Valute.USD.Value.toFixed(4).replace('.', ',');
        const EURrate = currencyResponse.data.Valute.EUR.Value.toFixed(4).replace('.', ',');
        setRates({ USDrate, EURrate });
        console.log('✅ Курс валют загружен');
      } catch (currencyError) {
        console.error('❌ Ошибка загрузки валюты:', currencyError);
      }

      // 2. Цитата дня на русском (Forismatic API + JSONP)
      try {
        const callbackName = `jsonp_callback_${Date.now()}`;
        window[callbackName] = (data) => {
          if (data && data.quoteText) {
            setAdvice({
              text: data.quoteText,
              author: data.quoteAuthor || 'Неизвестный автор',
              emoji: '💡'
            });
          } else {
            throw new Error('Не удалось загрузить цитату');
          }
          delete window[callbackName];
        };
        const script = document.createElement('script');
        script.src = `https://api.forismatic.com/api/1.0/?method=getQuote&format=jsonp&lang=ru&jsonp=${callbackName}`;
        document.body.appendChild(script);
        console.log('✅ Цитата дня загружена');
      } catch (adviceError) {
        console.error('❌ Ошибка загрузки цитаты:', adviceError);
        setAdvice({
          text: 'Делайте короткие перерывы каждые 90 минут, чтобы сохранять фокус.',
          author: 'Совет дня',
          emoji: '💡'
        });
      }

      // 3. Погода: температура + вероятность дождя + ветер
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const lat = position.coords.latitude;
              const lon = position.coords.longitude;
              // Запрашиваем current_weather (температура, ветер) и почасовую вероятность дождя
              const weatherResponse = await axios.get(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation_probability`
              );

              // Вероятность дождя для текущего часа (берём первый час)
              let precipitationProbability = 0;
              if (weatherResponse.data.hourly && weatherResponse.data.hourly.precipitation_probability.length > 0) {
                precipitationProbability = weatherResponse.data.hourly.precipitation_probability[0];
              }

              setWeatherData({
                temperature: weatherResponse.data.current_weather.temperature,
                precipitation: precipitationProbability,
                windspeed: weatherResponse.data.current_weather.windspeed,
              });
              console.log('✅ Погода загружена');
            } catch (weatherError) {
              console.error('❌ Ошибка загрузки погоды:', weatherError);
            } finally {
              setLoading(false);
            }
          },
          (geoError) => {
            console.error('❌ Геолокация недоступна:', geoError);
            setLoading(false);
          }
        );
      } else {
        console.error('❌ Браузер не поддерживает геолокацию');
        setLoading(false);
      }
    }

    fetchAllData();
  }, []);

  // Сохранение задач в localStorage
  useEffect(() => {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const addTask = (userInput) => {
    if (userInput.trim()) {
      const newItem = {
        id: Math.random().toString(36).substr(2, 9),
        task: userInput,
        complete: false
      };
      setTodos([...todos, newItem]);
    }
  };

  const removeTask = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const handleToggle = (id) => {
    setTodos(
      todos.map((task) =>
        task.id === id ? { ...task, complete: !task.complete } : task
      )
    );
  };

  return (
    <div className="App">
      {loading && <p>⏳ Загрузка данных...</p>}

      <div className="info">
        <div className="money">
          <div>💵 Доллар США $ — {rates.USDrate || 'нет данных'} руб.</div>
          <div>💶 Евро € — {rates.EURrate || 'нет данных'} руб.</div>
        </div>

        {weatherData && (
          <div className="weather-info">
            <div>
              🌤️ Погода сегодня: <br />
              🌡️ {weatherData.temperature}°C &nbsp;
              ☔ {weatherData.precipitation}% дождь &nbsp;
              💨 {weatherData.windspeed} км/ч &nbsp;
            </div>
          </div>
        )}

        {advice && (
          <div className="advice-info">
            <div className="advice-emoji">{advice.emoji}</div>
            <div className="advice-content">
              <div className="advice-text">"{advice.text}"</div>
              <div className="advice-author">{advice.author}</div>
            </div>
          </div>
        )}
      </div>

      <header>
        <h1 className="list-header">📋 Список задач: {todos.length}</h1>
      </header>

      <ToDoForm addTask={addTask} />

      {todos.map((todo) => (
        <ToDo
          todo={todo}
          key={todo.id}
          toggleTask={handleToggle}
          removeTask={removeTask}
        />
      ))}
    </div>
  );
}

export default App;