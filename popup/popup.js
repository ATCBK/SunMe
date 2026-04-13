// ===== 常量 =====

// Open-Meteo WMO 天气代码中，属于降水类的范围
// https://open-meteo.com/en/docs
// 51-55: 毛毛雨  56-57: 冻毛毛雨  61-65: 雨  66-67: 冻雨
// 71-77: 雪  80-82: 阵雨  85-86: 阵雪  95-99: 雷暴
const RAIN_CODES = new Set([
  51, 53, 55,       // 毛毛雨
  56, 57,            // 冻毛毛雨
  61, 63, 65,        // 雨
  66, 67,            // 冻雨
  71, 73, 75, 77,    // 雪
  80, 81, 82,        // 阵雨
  85, 86,            // 阵雪
  95, 96, 99,        // 雷暴
]);

// ===== DOM 元素 =====
const $ = (id) => document.getElementById(id);

const weatherUI = {
  loading: $('loading'),
  manualCity: $('manual-city'),
  cityInput: $('city-input'),
  searchCityBtn: $('search-city-btn'),
  cityError: $('city-error'),
  normalView: $('normal-view'),
  rainView: $('rain-view'),
  refreshBtn: $('refresh-btn'),
  resetBtn: $('reset-btn'),
  cityName: $('city-name'),
  weatherIcon: $('weather-icon'),
  temperature: $('temperature'),
  weatherDesc: $('weather-desc'),
  humidity: $('humidity'),
  wind: $('wind'),
  updateTime: $('update-time'),
  rainCityName: $('rain-city-name'),
  rainTemperature: $('rain-temperature'),
};

// ===== 工具函数 =====

function showWeatherView(viewName) {
  weatherUI.loading.classList.add('hidden');
  weatherUI.manualCity.classList.add('hidden');
  weatherUI.normalView.classList.add('hidden');
  weatherUI.rainView.classList.add('hidden');
  weatherUI.refreshBtn.classList.add('hidden');
  weatherUI.resetBtn.classList.add('hidden');

  if (viewName === 'loading') {
    weatherUI.loading.classList.remove('hidden');
  } else if (viewName === 'manual') {
    weatherUI.manualCity.classList.remove('hidden');
  } else if (viewName === 'normal') {
    weatherUI.normalView.classList.remove('hidden');
    weatherUI.refreshBtn.classList.remove('hidden');
    weatherUI.resetBtn.classList.remove('hidden');
  } else if (viewName === 'rain') {
    weatherUI.rainView.classList.remove('hidden');
    weatherUI.refreshBtn.classList.remove('hidden');
    weatherUI.resetBtn.classList.remove('hidden');
  }
}

function showError(el, message) {
  el.textContent = message;
  el.classList.remove('hidden');
}

function hideError(el) {
  el.classList.add('hidden');
}

function isRaining(code) {
  return RAIN_CODES.has(code);
}

// WMO 天气代码 → emoji
function codeToEmoji(code) {
  if (code === 0) return '☀️';           // 晴
  if (code === 1) return '🌤️';           // 基本晴
  if (code === 2) return '⛅';           // 部分多云
  if (code === 3) return '☁️';           // 多云
  if ([45, 48].includes(code)) return '🌫️';  // 雾
  if ([51, 53, 55].includes(code)) return '🌧️';  // 毛毛雨
  if ([56, 57].includes(code)) return '🌧️';      // 冻毛毛雨
  if ([61, 63, 65].includes(code)) return '🌧️';  // 雨
  if ([66, 67].includes(code)) return '🧊';      // 冻雨
  if ([71, 73, 75, 77].includes(code)) return '🌨️';  // 雪
  if ([80, 81, 82].includes(code)) return '🌧️';  // 阵雨
  if ([85, 86].includes(code)) return '🌨️';      // 阵雪
  if ([95, 96, 99].includes(code)) return '⛈️';  // 雷暴
  return '🌤️';
}

// WMO 天气代码 → 中文描述
function codeToText(code) {
  const map = {
    0: '晴',
    1: '基本晴',
    2: '多云',
    3: '阴天',
    45: '雾',
    48: '雾凇',
    51: '小毛毛雨',
    53: '毛毛雨',
    55: '大毛毛雨',
    56: '冻毛毛雨',
    57: '强冻毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    66: '冻雨',
    67: '强冻雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '雪粒',
    80: '小阵雨',
    81: '阵雨',
    82: '大阵雨',
    85: '小阵雪',
    86: '大阵雪',
    95: '雷暴',
    96: '雷暴伴冰雹',
    99: '强雷暴伴冰雹',
  };
  return map[code] || '未知';
}

// ===== API 调用 =====

async function getLocation() {
  const services = [
    {
      url: 'https://ipinfo.io/json',
      parse: (d) => d.city,
    },
    {
      url: 'https://ipapi.co/json/',
      parse: (d) => d.city,
    },
  ];

  for (const svc of services) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(svc.url, { signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        const data = await resp.json();
        const city = svc.parse(data);
        if (city) return city;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

// 用 Open-Meteo 地理编码 API 把城市名转成经纬度
async function geocodeCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh`;
  const resp = await fetch(url);

  if (!resp.ok) throw new Error('城市查询失败');

  const data = await resp.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('未找到该城市');
  }

  const loc = data.results[0];
  return {
    lat: loc.latitude,
    lon: loc.longitude,
    name: loc.name,
    admin1: loc.admin1 || '',  // 省份/州
    country: loc.country || '',
  };
}

// 获取实时天气 - Open-Meteo（完全免费，无需 API Key）
async function getRealtimeWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
  const resp = await fetch(url);

  if (!resp.ok) throw new Error('天气请求失败');

  const data = await resp.json();

  if (!data.current) throw new Error('天气数据获取失败');

  const cur = data.current;
  return {
    temp: Math.round(cur.temperature_2m),
    code: cur.weather_code,
    humidity: cur.relative_humidity_2m,
    windSpeed: cur.wind_speed_10m,
  };
}

// ===== 渲染函数 =====

function renderNormalView(weather, cityInfo) {
  const label = cityInfo.admin1
    ? `${cityInfo.admin1} · ${cityInfo.name}`
    : cityInfo.name;
  weatherUI.cityName.textContent = label;
  weatherUI.weatherIcon.textContent = codeToEmoji(weather.code);
  weatherUI.temperature.textContent = weather.temp;
  weatherUI.weatherDesc.textContent = codeToText(weather.code);
  weatherUI.humidity.textContent = `${weather.humidity}%`;
  weatherUI.wind.textContent = `${weather.windSpeed} km/h`;

  const now = new Date();
  weatherUI.updateTime.textContent = `更新于 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  showWeatherView('normal');
}

function renderRainView(weather, cityInfo) {
  const label = cityInfo.admin1
    ? `${cityInfo.admin1} · ${cityInfo.name}`
    : cityInfo.name;
  weatherUI.rainCityName.textContent = label;
  weatherUI.rainTemperature.textContent = `${weather.temp}°C · ${codeToText(weather.code)}`;
  showWeatherView('rain');
}

// ===== 缓存 =====

const CACHE_KEY = 'cached_weather_data';

async function cacheData(weather, cityInfo) {
  await chrome.storage.local.set({
    [CACHE_KEY]: { weather, cityInfo, time: Date.now() },
  });
}

async function getCachedData() {
  const result = await chrome.storage.local.get(CACHE_KEY);
  return result[CACHE_KEY] || null;
}

// ===== 核心流程 =====

let lastCityInfo = null;

async function fetchAndRender(manualCity) {
  try {
    let cityInfo;

    if (manualCity) {
      cityInfo = await geocodeCity(manualCity);
    } else {
      const detectedCity = await getLocation();
      if (!detectedCity) {
        showWeatherView('manual');
        return;
      }
      cityInfo = await geocodeCity(detectedCity);
    }

    lastCityInfo = cityInfo;

    const weather = await getRealtimeWeather(cityInfo.lat, cityInfo.lon);
    await cacheData(weather, cityInfo);

    if (isRaining(weather.code)) {
      renderRainView(weather, cityInfo);
    } else {
      renderNormalView(weather, cityInfo);
    }
  } catch (err) {
    console.error('fetchAndRender error:', err);
    if (err.name === 'AbortError') {
      showWeatherView('manual');
      showError(weatherUI.cityError, '请求超时，请检查网络');
    } else if (err.message.includes('未找到')) {
      showWeatherView('manual');
      showError(weatherUI.cityError, err.message);
    } else {
      showWeatherView('manual');
      showError(weatherUI.cityError, '网络连接失败，请重试');
    }
  }
}

async function init() {
  showWeatherView('loading');

  // 先展示缓存
  const cached = await getCachedData();
  if (cached && cached.weather && cached.cityInfo) {
    lastCityInfo = cached.cityInfo;
    if (isRaining(cached.weather.code)) {
      renderRainView(cached.weather, cached.cityInfo);
    } else {
      renderNormalView(cached.weather, cached.cityInfo);
    }
  }

  // 后台刷新
  if (cached && cached.weather && cached.cityInfo) {
    fetchAndRender().catch(() => {});
  } else {
    await fetchAndRender();
  }
}

// ===== 事件绑定 =====

// 手动查询城市
weatherUI.searchCityBtn.addEventListener('click', async () => {
  const city = weatherUI.cityInput.value.trim();
  if (!city) {
    showError(weatherUI.cityError, '请输入城市名');
    return;
  }
  hideError(weatherUI.cityError);
  showWeatherView('loading');
  await fetchAndRender(city);
});

weatherUI.cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') weatherUI.searchCityBtn.click();
});

// 刷新按钮
weatherUI.refreshBtn.addEventListener('click', async () => {
  showWeatherView('loading');
  await fetchAndRender(lastCityInfo?.name || undefined);
});

// 重新定位按钮
weatherUI.resetBtn.addEventListener('click', async () => {
  showWeatherView('loading');
  await fetchAndRender();
});

// ===== 启动 =====
init();
