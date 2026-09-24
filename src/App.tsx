import { useState, useEffect } from 'react';

// 型定義
type DailyForecast = {
  date: string;
  tempMax: number;
  tempMin: number;
  description: string;
  icon: string;
};

type CityForecast = {
  cityName: string;
  currentTemp: number;
  currentDescription: string;
  currentIcon: string;
  daily: DailyForecast[];
};

// 表示したい都市のリスト
const CITIES = [
  { name: '茨木市', query: 'Ibaraki,JP' },
  { name: '京都市左京区', query: 'Sakyo-ku,JP' },
];

const API_KEY = import.meta.env.VITE_API_KEY;

export default function App() {
  const [weatherList, setWeatherList] = useState<CityForecast[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!API_KEY) {
        setError('APIキーが設定されていません。Vercelの環境変数を確認してください。');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 各都市の週間天気（5日間/3時間ごと）データを並列で取得
        const results = await Promise.all(
          CITIES.map(async (city) => {
            const response = await fetch(
              `https://api.openweathermap.org/data/2.5/forecast?q=${city.query}&units=metric&lang=ja&appid=${API_KEY}`
            );

            if (!response.ok) {
              throw new Error(`${city.name} のデータ取得に失敗しました`);
            }

            const data = await response.json();

            // 1. 現在の天気（最新の3時間データ）
            const current = data.list[0];

            // 2. 3時間ごとのデータを日別にグループ化して最高/最低気温を整理
            const dailyMap: {
              [key: string]: {
                temps: number[];
                description: string;
                icon: string;
                dateStr: string;
              };
            } = {};

            data.list.forEach((item: any) => {
              const dateObj = new Date(item.dt * 1000);
              // 日付キー (例: "2026-09-24")
              const dateKey = dateObj.toISOString().split('T')[0];

              if (!dailyMap[dateKey]) {
                const month = dateObj.getMonth() + 1;
                const day = dateObj.getDate();
                const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];

                dailyMap[dateKey] = {
                  temps: [],
                  description: item.weather[0].description,
                  icon: item.weather[0].icon,
                  dateStr: `${month}/${day}(${dayOfWeek})`,
                };
              }

              // 気温を配列に記録
              dailyMap[dateKey].temps.push(item.main.temp);

              // 昼（12:00前後）の天気を優先的にアイコン・説明として採用
              if (item.dt_txt.includes('12:00:00')) {
                dailyMap[dateKey].description = item.weather[0].description;
                dailyMap[dateKey].icon = item.weather[0].icon;
              }
            });

            // 日別データを配列化（最大5日分）して最高・最低気温を計算
            const dailyList: DailyForecast[] = Object.values(dailyMap)
              .slice(0, 5)
              .map((day) => ({
                date: day.dateStr,
                tempMax: Math.round(Math.max(...day.temps)),
                tempMin: Math.round(Math.min(...day.temps)),
                description: day.description,
                icon: day.icon,
              }));

            return {
              cityName: city.name,
              currentTemp: Math.round(current.main.temp),
              currentDescription: current.weather[0].description,
              currentIcon: current.weather[0].icon,
              daily: dailyList,
            };
          })
        );

        setWeatherList(results);
      } catch (err: any) {
        console.error(err);
        setError(err.message || '天気データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-sky-200 to-indigo-300 p-4 md:p-8 flex flex-col items-center">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-white drop-shadow-md">
          🌤️ 週間天気予報
        </h1>
      </header>

      {/* ローディング表示 */}
      {loading && (
        <div className="flex items-center justify-center mt-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
          <span className="ml-3 text-white font-medium">データを読み込み中...</span>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-500/80 text-white p-4 rounded-xl shadow-lg max-w-md w-full text-center my-10 backdrop-blur-md">
          <p className="font-bold">エラーが発生しました</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* 天気カード一覧 */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-5xl">
          {weatherList.map((city, index) => (
            <div
              key={index}
              className="bg-white/80 backdrop-blur-lg rounded-3xl p-6 shadow-xl border border-white/40 flex flex-col justify-between"
            >
              {/* 都市名と現在の天気 */}
              <div className="flex items-center justify-between pb-6 border-b border-gray-200/60">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{city.cityName}</h2>
                  <p className="text-gray-600 capitalize text-sm mt-1">
                    現在の天気: {city.currentDescription}
                  </p>
                </div>
                <div className="flex items-center">
                  <img
                    src={`https://openweathermap.org/img/wn/${city.currentIcon}@2x.png`}
                    alt={city.currentDescription}
                    className="w-16 h-16 drop-shadow"
                  />
                  <span className="text-4xl font-black text-gray-800 ml-1">
                    {city.currentTemp}°C
                  </span>
                </div>
              </div>

              {/* 5日間の週間天気予報 */}
              <div className="mt-6">
                <h3 className="text-sm font-bold text-gray-500 mb-3 tracking-wider uppercase">
                  5日間の予報
                </h3>
                <div className="space-y-3">
                  {city.daily.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className="flex items-center justify-between bg-white/60 p-3 rounded-2xl shadow-sm border border-white/50"
                    >
                      {/* 日付 */}
                      <span className="font-semibold text-gray-700 w-24">
                        {day.date}
                      </span>

                      {/* 天気アイコン ＆ 説明 */}
                      <div className="flex items-center gap-2 flex-1 justify-center">
                        <img
                          src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                          alt={day.description}
                          className="w-8 h-8"
                        />
                        <span className="text-xs text-gray-600 hidden sm:inline">
                          {day.description}
                        </span>
                      </div>

                      {/* 最高 / 最低気温 */}
                      <div className="text-right w-24 font-bold text-sm">
                        <span className="text-red-500">{day.tempMax}°</span>
                        <span className="text-gray-400 mx-1.5">/</span>
                        <span className="text-blue-500">{day.tempMin}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}