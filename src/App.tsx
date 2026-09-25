import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import bgImage from './assets/background.jpg';

// 3時間ごとの予報型
type HourlyForecast = {
  dt: number;
  timeStr: string;
  temp: number;
  icon: string;
  pop: number;
};

// 5日間の日別予報型
type DailyForecast = {
  date: string;
  tempMax: number;
  tempMin: number;
  description: string;
  icon: string;
};

// 1つの都市が保持する全天気データ
type WeatherData = {
  id: string;
  displayName: string;
  lat: number;
  lon: number;
  currentTemp: number;
  feelsLike: number;
  tempMax: number;
  tempMin: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  hourlyList: HourlyForecast[];
  dailyList: DailyForecast[];
};

// 緯度・経度でピンポイント指定
const CITIES = [
  { id: 'ibaraki', name: '大阪府 茨木市', lat: 34.8162, lon: 135.5684 },
  { id: 'sakyo', name: '京都府 京都市左京区', lat: 35.0431, lon: 135.7876 },
];

const API_KEY = import.meta.env.VITE_API_KEY;

export default function App() {
  const [weatherList, setWeatherList] = useState<WeatherData[]>([]);
  const [selectedWeather, setSelectedWeather] = useState<WeatherData | null>(null);
  const [showRadar, setShowRadar] = useState(false); // ★ 雨雲レーダー表示フラグ
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeathers();
  }, []);

  const fetchWeathers = async () => {
    if (!API_KEY) {
      setError('APIキーが設定されていません。.envやVercelの設定を確認してください。');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        CITIES.map(async (city) => {
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${city.lat}&lon=${city.lon}&units=metric&lang=ja&appid=${API_KEY}`
          );

          if (!res.ok) {
            throw new Error(`${city.name} のデータ取得に失敗しました`);
          }

          const data = await res.json();
          const current = data.list[0];

          // 1. 3時間ごとの予報（直近24時間分 = 8コマ）
          const hourlyList: HourlyForecast[] = data.list.slice(0, 8).map((item: any) => {
            const date = new Date(item.dt * 1000);
            return {
              dt: item.dt,
              timeStr: date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
              temp: Math.round(item.main.temp),
              icon: item.weather[0].icon,
              pop: Math.round((item.pop || 0) * 100),
            };
          });

          // 2. 5日間の週間天気予報（日別に集計）
          const dailyMap: { [key: string]: { temps: number[]; description: string; icon: string; dateStr: string } } = {};

          data.list.forEach((item: any) => {
            const dateObj = new Date(item.dt * 1000);
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

            dailyMap[dateKey].temps.push(item.main.temp);

            if (item.dt_txt.includes('12:00:00')) {
              dailyMap[dateKey].description = item.weather[0].description;
              dailyMap[dateKey].icon = item.weather[0].icon;
            }
          });

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
            id: city.id,
            displayName: city.name,
            lat: city.lat,
            lon: city.lon,
            currentTemp: Math.round(current.main.temp),
            feelsLike: Math.round(current.main.feels_like),
            tempMax: Math.round(current.main.temp_max),
            tempMin: Math.round(current.main.temp_min),
            humidity: current.main.humidity,
            windSpeed: current.wind.speed,
            description: current.weather[0].description,
            icon: current.weather[0].icon,
            hourlyList,
            dailyList,
          };
        })
      );

      setWeatherList(results);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'データ取得時にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat p-4 md:p-8 flex flex-col items-center"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="w-full max-w-3xl flex flex-col min-h-[90vh]">
        
        <div className="flex-grow">
          {/* ヘッダー */}
          <header className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-white drop-shadow-md tracking-wide">
              🌤 自分だけのウェザーニュース🐶
            </h1>
            <p className="text-white/90 text-sm mt-1 drop-shadow-sm">自宅周辺 & 京大周辺</p>
          </header>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-500/90 text-white p-4 rounded-2xl text-center mb-6 shadow-lg backdrop-blur-md">
              <p className="font-bold">エラーが発生しました</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* ローディング表示 */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent mb-3 shadow-sm"></div>
              <p className="text-white font-bold drop-shadow-md">天気を取得中...</p>
            </div>
          ) : selectedWeather ? (

            /* ==================== 【画面2】詳細 & 予報画面 ==================== */
            <div className="bg-white/85 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/50">
              
              {/* 上部操作ボタン */}
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => {
                    setSelectedWeather(null);
                    setShowRadar(false);
                  }}
                  className="text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  ← 地点一覧へ戻る
                </button>

                {/* ★ 雨雲レーダー切り替えボタン */}
                <button
                  onClick={() => setShowRadar(!showRadar)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs md:text-sm py-2 px-4 rounded-full shadow-md transition cursor-pointer"
                >
                  {showRadar ? '📄 詳細表示に戻る' : '🌧 雨雲レーダーを表示'}
                </button>
              </div>

              {/* ★ 雨雲レーダーマップ表示エリア（ボタンで切替） */}
              {showRadar ? (
                <div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">
                    {selectedWeather.displayName} の雨雲レーダー
                  </h2>
                  <p className="text-xs text-slate-500 text-center mb-4">ドラッグやズームで地図を操作できます</p>
                  
                  <div className="h-96 w-full rounded-2xl overflow-hidden shadow-inner border border-slate-200">
                    <MapContainer
                      center={[selectedWeather.lat, selectedWeather.lon]}
                      zoom={10}
                      scrollWheelZoom={true}
                      style={{ height: '100%', width: '100%' }}
                    >
                      {/* ベースとなるオープンストリートマップ */}
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {/* ★ OpenWeatherMapの雨雲（降水）レイヤー */}
                      <TileLayer
                        url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`}
                        opacity={0.7}
                      />
                      {/* 選択中の拠点マーカー */}
                      <Marker position={[selectedWeather.lat, selectedWeather.lon]}>
                        <Popup>{selectedWeather.displayName}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </div>
              ) : (

                /* 通常の詳細情報表示 */
                <div className="text-center">
                  <h2 className="text-3xl font-black text-slate-800">{selectedWeather.displayName}</h2>
                  <p className="text-slate-600 capitalize text-sm mt-0.5">{selectedWeather.description}</p>

                  <div className="flex items-center justify-center my-2">
                    <img
                      src={`https://openweathermap.org/img/wn/${selectedWeather.icon}@4x.png`}
                      alt="weather icon"
                      className="w-24 h-24 drop-shadow"
                    />
                    <p className="text-6xl font-black text-slate-800 ml-2">
                      {selectedWeather.currentTemp}°C
                    </p>
                  </div>

                  {/* 詳細情報カード */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
                    <div className="bg-white/70 p-3 rounded-2xl text-center shadow-sm">
                      <p className="text-xs text-slate-400 font-bold">体感温度</p>
                      <p className="text-lg font-bold text-slate-700 mt-0.5">{selectedWeather.feelsLike}°C</p>
                    </div>
                    <div className="bg-white/70 p-3 rounded-2xl text-center shadow-sm">
                      <p className="text-xs text-slate-400 font-bold">最高 / 最低</p>
                      <p className="text-lg font-bold text-slate-700 mt-0.5">
                        <span className="text-red-500">{selectedWeather.tempMax}°</span> / <span className="text-blue-500">{selectedWeather.tempMin}°</span>
                      </p>
                    </div>
                    <div className="bg-white/70 p-3 rounded-2xl text-center shadow-sm">
                      <p className="text-xs text-slate-400 font-bold">湿度</p>
                      <p className="text-lg font-bold text-slate-700 mt-0.5">{selectedWeather.humidity}%</p>
                    </div>
                    <div className="bg-white/70 p-3 rounded-2xl text-center shadow-sm">
                      <p className="text-xs text-slate-400 font-bold">風速</p>
                      <p className="text-lg font-bold text-slate-700 mt-0.5">{selectedWeather.windSpeed} m/s</p>
                    </div>
                  </div>

                  {/* 3時間ごとの天気予報 */}
                  <div className="mt-8 text-left">
                    <h3 className="text-md font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <span>⏱</span> 3時間ごとの天気予報（24時間）
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-4 pt-1">
                      {selectedWeather.hourlyList.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex-shrink-0 bg-blue-50/80 border border-blue-100 p-3 rounded-2xl text-center min-w-[90px] shadow-sm"
                        >
                          <p className="text-xs font-bold text-slate-500">{item.timeStr}</p>
                          <img
                            src={`https://openweathermap.org/img/wn/${item.icon}.png`}
                            alt="icon"
                            className="w-10 h-10 mx-auto my-1 drop-shadow-sm"
                          />
                          <p className="text-base font-extrabold text-slate-800">{item.temp}°C</p>
                          <p className="text-[11px] font-bold text-blue-600 mt-1">☔ {item.pop}%</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5日間の週間天気予報 */}
                  <div className="mt-8 text-left">
                    <h3 className="text-md font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <span>📅</span> 5日間の週間天気予報
                    </h3>
                    <div className="space-y-2.5">
                      {selectedWeather.dailyList.map((day, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white/70 p-3 rounded-2xl shadow-sm border border-slate-100"
                        >
                          <span className="font-semibold text-slate-700 w-24">{day.date}</span>
                          <div className="flex items-center gap-2 flex-1 justify-center">
                            <img
                              src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                              alt="icon"
                              className="w-8 h-8 drop-shadow-sm"
                            />
                            <span className="text-xs text-slate-600 capitalize">{day.description}</span>
                          </div>
                          <div className="text-right w-24 font-bold text-sm">
                            <span className="text-red-500">{day.tempMax}°</span>
                            <span className="text-slate-300 mx-1.5">/</span>
                            <span className="text-blue-500">{day.tempMin}°</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          ) : (

            /* ==================== 【画面1】オープニング（地点選択カード） ==================== */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {weatherList.map((data) => (
                <div
                  key={data.id}
                  onClick={() => setSelectedWeather(data)}
                  className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-xl hover:shadow-2xl transition transform hover:-translate-y-1 cursor-pointer border border-white/60 group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800">{data.displayName}</h3>
                      <p className="text-xs text-slate-500 capitalize mt-1 font-medium">
                        {data.description}
                      </p>
                    </div>
                    <img
                      src={`https://openweathermap.org/img/wn/${data.icon}@2x.png`}
                      alt="icon"
                      className="w-14 h-14 -mt-2 drop-shadow"
                    />
                  </div>

                  <div className="mt-6 flex items-baseline justify-between">
                    <p className="text-5xl font-black text-slate-800">{data.currentTemp}°C</p>
                    <p className="text-sm text-blue-600 font-bold group-hover:underline">
                      詳細・予報を見る ➔
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <footer className="text-center text-xs text-white/90 drop-shadow-md mt-10 pb-2">
          Data provided by OpenWeatherMap
        </footer>

      </div>
    </div>
  );
}