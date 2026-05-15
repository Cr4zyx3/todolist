import React, { useState, useEffect } from 'react';
import './App.css';
import ToDoForm from './AddTask';
import ToDo from './Task';
import axios from 'axios';

const TASKS_STORAGE_KEY = 'tasks-list-project-web';

const timeZoneList = [
  { name: 'Калининград', zone: 'Europe/Kaliningrad' },
  { name: 'Москва', zone: 'Europe/Moscow' },
  { name: 'Екатеринбург', zone: 'Asia/Yekaterinburg' },
  { name: 'Красноярск', zone: 'Asia/Krasnoyarsk' },
  { name: 'Владивосток', zone: 'Asia/Vladivostok' }
];

function App() {
  const [rates, setRates] = useState({});
  const [weatherData, setWeatherData] = useState(null);
  const [timeZones, setTimeZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState(() => {
    const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
    return storedTasks ? JSON.parse(storedTasks) : [];
  });

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);

      try {
        const currencyResponse = await axios.get(
          'https://www.cbr-xml-daily.ru/daily_json.js'
        );

        const USDrate = currencyResponse.data.Valute.USD.Value
          .toFixed(4)
          .replace('.', ',');

        const EURrate = currencyResponse.data.Valute.EUR.Value
          .toFixed(4)
          .replace('.', ',');

        setRates({ USDrate, EURrate });
      } catch (currencyError) {
        console.error('Ошибка загрузки валюты:', currencyError);
      }

      try {
        const timeResponses = await Promise.allSettled(
          timeZoneList.map((item) =>
            axios.get(
              `https://timeapi.io/api/time/current/zone?timeZone=${item.zone}`
            )
          )
        );

        const formattedTimes = timeResponses
          .map((result, index) => {
            if (result.status !== 'fulfilled') {
              return null;
            }

            const data = result.value.data;

            const date = new Date(
              data.year,
              data.month - 1,
              data.day,
              data.hour,
              data.minute,
              data.seconds
            );

            return {
              city: timeZoneList[index].name,
              zone: timeZoneList[index].zone,
              date
            };
          })
          .filter(Boolean);

        setTimeZones(formattedTimes);
      } catch (timeError) {
        console.error('Ошибка загрузки времени:', timeError);
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            const weatherResponse = await axios.get(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
            );

            setWeatherData(weatherResponse.data.current_weather);
          } catch (weatherError) {
            console.error('Ошибка загрузки погоды:', weatherError);
          }
        },
        (geoError) => {
          console.error('Геолокация недоступна:', geoError);
        }
      );

      setLoading(false);
    }

    fetchAllData();
  }, []);

  useEffect(() => {
    if (timeZones.length === 0) return;

    const timer = setInterval(() => {
      setTimeZones((prevTimes) =>
        prevTimes.map((item) => ({
          ...item,
          date: new Date(item.date.getTime() + 1000)
        }))
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [timeZones.length]);

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
      {loading && <p>Загрузка...</p>}

      <div className="info">
        <div className="money">
          <div>Доллар США $ — {rates.USDrate || 'нет данных'} руб.</div>
          <div>Евро € — {rates.EURrate || 'нет данных'} руб.</div>
        </div>

        {weatherData && (
          <div className="weather-info">
            <div>
              Погода сегодня: <br />
              🌡️ {weatherData.temperature}°C&nbsp;
              💨 {weatherData.windspeed} км/ч&nbsp;
              🧭 {weatherData.winddirection}°
            </div>
          </div>
        )}

        {timeZones.length > 0 && (
          <div className="timezone-info">
            <h3>Часовые пояса России</h3>

            {timeZones.map((item) => (
              <div key={item.city} className="timezone-item">
                <span>{item.city}</span>
                <strong>
                  {item.date.toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </strong>
                <small>{item.zone}</small>
              </div>
            ))}
          </div>
        )}
      </div>

      <header>
        <h1 className="list-header">Список задач: {todos.length}</h1>
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