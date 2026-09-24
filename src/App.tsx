import { useState, useEffect } from 'react';
import bgImage from './assets/background.jpg';

// 予報1コマ分の型定義
type ForecastItem = {
  dt: number;
  dt_txt: string;
  main: {
    temp: number;
    humidity: number;
  };
  weather: {
    description: string;
    icon: string;
  }[];
  pop: number; // 降水確率 (0 〜 1)
};

// 天気データ（現在＋予報）の型定義
type WeatherData = {
  id: string;
  displayName: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
  weather: {
    main: string;
    description: string;
    icon: string;
  }[];
  forecastList: ForecastItem[]; // 今後の予報リスト
};

// 環境変数からAPIキーを取得
const API_KEY = import.meta.env.VITE_API_KEY;

// 表示したい2つの特定地点（緯度・経度でピンポイント指定）
const TARGET_LOCATIONS = [
  { id: 'ibaraki', name: '大阪府 茨木市', lat: 34.8162, lon: 135.5684 },
  { id: 'sakyo', name: '京都府 京都市左京区', lat: 35.0431, lon: 135.7876 },
];

export default function App() {
  const [weatherList, setWeatherList] = useState<WeatherData[]>([]);
  const [selectedWeather, setSelectedWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 初回読み込み時に2地点の「現在の天気」と「天気予報」を一括取得
  useEffect(() => {
    fetchWeathers();
  }, []);

  const fetchWeathers = async () => {
    setLoading(true);
    setError('');
    try {
      const promises = TARGET_LOCATIONS.map(async (loc) => {
        const [currentRes, forecastRes] = await Promise.all([
          fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${loc.lat}&lon=${loc.lon}&units=metric&lang=ja&appid=${API_KEY}`
          ),
          fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${loc.lat}&lon=${loc.lon}&units=metric&lang=ja&appid=${API_KEY}`
          ),
        ]);

        if (!currentRes.ok || !forecastRes.ok) {
          throw new Error(`${loc.name} の天気データの取得に失敗しました`);
        }

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        return {
          ...currentData,
          id: loc.id,
          displayName: loc.name,
          forecastList: forecastData.list.slice(0, 8),
        };
      });

      const results = await Promise.all(promises);
      setWeatherList(results);
    } catch (err: any) {
      setError(err.message || 'データ取得時にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 時刻を「15:00」のような読みやすい形式に変換する関数
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    /* ★ w-full と min-h-screen で画面全体に背景画像を広げる設定 */
    <div 
      className="w-full min-h-screen bg-cover bg-center bg-no-repeat flex flex-col items-center justify-center p-6"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="w-full max-w-2xl">
        
        {/* ヘッダー */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white drop-shadow-md tracking-wide mb-2">
            舘村勇人専用のweather news
          </h1>
        </header>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50/90 backdrop-blur-md text-red-600 p-4 rounded-xl text-center mb-6 border border-red-100 shadow-lg">
            {error}
          </div>
        )}

        {/* ローディング表示 */}
        {loading ? (
          <div className="text-center py-12 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-slate-600 font-bold">天気を取得中...</p>
          </div>
        ) : selectedWeather ? (
          /* ----------------- 2. 地点の詳細 & 予報画面 ----------------- */
          <div className="bg-white/85 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/50">
            <button
              onClick={() => setSelectedWeather(null)}
              className="mb-6 text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              ← トップに戻る
            </button>

            {/* 現在の天気サマリー */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-800 mb-1">{selectedWeather.displayName}</h2>
              <p className="text-slate-600 capitalize font-medium">{selectedWeather.weather[0].description}</p>

              <div className="flex items-center justify-center my-2">
                <img
                  src={`https://openweathermap.org/img/wn/${selectedWeather.weather[0].icon}@4x.png`}
                  alt="weather icon"
                  className="w-24 h-24"
                />
                <p className="text-6xl font-black text-slate-800">
                  {Math.round(selectedWeather.main.temp)}°C
                </p>
              </div>

              {/* 現在の詳細データ */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
                <div className="bg-white/60 p-3 rounded-xl text-center shadow-sm">
                  <p className="text-xs text-slate-500 font-bold">体感温度</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">
                    {Math.round(selectedWeather.main.feels_like)}°C
                  </p>
                </div>
                <div className="bg-white/60 p-3 rounded-xl text-center shadow-sm">
                  <p className="text-xs text-slate-500 font-bold">最高 / 最低</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">
                    {Math.round(selectedWeather.main.temp_max)}° / {Math.round(selectedWeather.main.temp_min)}°
                  </p>
                </div>
                <div className="bg-white/60 p-3 rounded-xl text-center shadow-sm">
                  <p className="text-xs text-slate-500 font-bold">湿度</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">
                    {selectedWeather.main.humidity}%
                  </p>
                </div>
                <div className="bg-white/60 p-3 rounded-xl text-center shadow-sm">
                  <p className="text-xs text-slate-500 font-bold">風速</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">
                    {selectedWeather.wind.speed} m/s
                  </p>
                </div>
              </div>

              {/* 3時間ごとの天気予報 */}
              <div className="mt-8 text-left">
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span>⏱</span> 3時間ごとの天気予報（今後24時間）
                </h3>

                <div className="flex gap-3 overflow-x-auto pb-4 pt-1 scrollbar-thin">
                  {selectedWeather.forecastList.map((item, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 bg-white/70 border border-white/60 p-3 rounded-xl text-center min-w-[90px] shadow-sm"
                    >
                      <p className="text-xs font-bold text-slate-600">
                        {formatTime(item.dt)}
                      </p>
                      <img
                        src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`}
                        alt="forecast icon"
                        className="w-10 h-10 mx-auto my-1"
                      />
                      <p className="text-base font-extrabold text-slate-800">
                        {Math.round(item.main.temp)}°C
                      </p>
                      <p className="text-[11px] font-bold text-blue-600 mt-1">
                        ☔ {Math.round(item.pop * 100)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* ----------------- 1. オープニング（2地点のカード一覧） ----------------- */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {weatherList.map((data) => (
              <div
                key={data.id}
                onClick={() => setSelectedWeather(data)}
                className="bg-white/85 backdrop-blur-md p-6 rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1 cursor-pointer border border-white/60 group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{data.displayName}</h3>
                    <p className="text-xs text-slate-500 capitalize mt-1 font-medium">
                      {data.weather[0].description}
                    </p>
                  </div>
                  <img
                    src={`https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`}
                    alt="icon"
                    className="w-12 h-12 -mt-2"
                  />
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <p className="text-4xl font-black text-slate-800">
                    {Math.round(data.main.temp)}°C
                  </p>
                  <p className="text-xs text-blue-600 font-bold group-hover:underline">
                    詳細 ➔
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}