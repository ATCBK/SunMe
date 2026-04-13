(function () {
  if (document.getElementById('healing-sun-widget')) return;

  // ===== 常量 =====
  const RAIN_CODES = new Set([
    51, 53, 55, 56, 57, 61, 63, 65, 66, 67,
    71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
  ]);

  // ===== 工具函数 =====
  function isRaining(code) { return RAIN_CODES.has(code); }

  function codeToEmoji(code) {
    if (code === 0) return '☀️';
    if (code === 1) return '🌤️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if ([45, 48].includes(code)) return '🌫️';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️';
    if ([66, 67].includes(code)) return '🧊';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return '🌨️';
    if ([95, 96, 99].includes(code)) return '⛈️';
    return '🌤️';
  }

  function codeToText(code) {
    const map = {
      0: '晴', 1: '基本晴', 2: '多云', 3: '阴天',
      45: '雾', 48: '雾凇',
      51: '小毛毛雨', 53: '毛毛雨', 55: '大毛毛雨',
      56: '冻毛毛雨', 57: '强冻毛毛雨',
      61: '小雨', 63: '中雨', 65: '大雨',
      66: '冻雨', 67: '强冻雨',
      71: '小雪', 73: '中雪', 75: '大雪', 77: '雪粒',
      80: '小阵雨', 81: '阵雨', 82: '大阵雨',
      85: '小阵雪', 86: '大阵雪',
      95: '雷暴', 96: '雷暴伴冰雹', 99: '强雷暴伴冰雹',
    };
    return map[code] || '未知';
  }

  // ===== API =====
  async function getLocation() {
    const services = [
      { url: 'https://ipinfo.io/json', parse: d => d.city },
      { url: 'https://ipapi.co/json/', parse: d => d.city },
    ];
    for (const svc of services) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const resp = await fetch(svc.url, { signal: ctrl.signal });
        clearTimeout(t);
        if (resp.ok) {
          const data = await resp.json();
          const city = svc.parse(data);
          if (city) return city;
        }
      } catch { continue; }
    }
    return null;
  }

  async function geocodeCity(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('城市查询失败');
    const data = await resp.json();
    if (!data.results || data.results.length === 0) throw new Error('未找到该城市');
    const loc = data.results[0];
    return {
      lat: loc.latitude, lon: loc.longitude,
      name: loc.name,
      admin1: loc.admin1 || '',
    };
  }

  async function getRealtimeWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('天气请求失败');
    const data = await resp.json();
    if (!data.current) throw new Error('天气数据获取失败');
    const c = data.current;
    return {
      temp: Math.round(c.temperature_2m),
      code: c.weather_code,
      humidity: c.relative_humidity_2m,
      windSpeed: c.wind_speed_10m,
    };
  }

  // ===== 创建 DOM =====
  const widget = document.createElement('div');
  widget.id = 'healing-sun-widget';
  widget.innerHTML = `
    <div class="hs-drag-bar" id="hs-drag-bar">
      <div class="hs-drag-dots"></div>
      <button class="hs-close-btn" id="hs-close-btn">✕</button>
    </div>
    <div class="hs-content" id="hs-content">
      <div class="hs-loading" id="hs-loading">
        <div class="hs-spinner"></div>
        <p>正在检测你的位置...</p>
      </div>
      <div class="hs-manual hidden" id="hs-manual">
        <div class="hs-manual-icon">📍</div>
        <p>无法自动定位，请输入城市：</p>
        <div class="hs-manual-form">
          <input type="text" id="hs-city-input" placeholder="例如：北京">
          <button id="hs-search-btn">查询</button>
        </div>
        <p class="hs-error-msg hidden" id="hs-error"></p>
      </div>
      <div class="hs-normal hidden" id="hs-normal">
        <div class="hs-city-name" id="hs-city-name"></div>
        <div class="hs-weather-main">
          <span class="hs-weather-icon-emoji" id="hs-weather-icon"></span>
          <div class="hs-temperature" id="hs-temperature"></div>
        </div>
        <div class="hs-weather-desc" id="hs-weather-desc"></div>
        <div class="hs-weather-details">
          <div class="hs-detail-item">
            <span class="hs-detail-label">湿度</span>
            <span class="hs-detail-value" id="hs-humidity"></span>
          </div>
          <div class="hs-detail-item">
            <span class="hs-detail-label">风速</span>
            <span class="hs-detail-value" id="hs-wind"></span>
          </div>
        </div>
        <div class="hs-update-time" id="hs-update-time"></div>
      </div>
      <div class="hs-rain hidden" id="hs-rain">
        <p class="hs-rain-message">外面在下雨...</p>
        <div id="hs-sun-container">
          <div class="hs-sun-rays">
            <div class="hs-ray"></div>
            <div class="hs-ray"></div>
            <div class="hs-ray"></div>
            <div class="hs-ray"></div>
            <div class="hs-ray"></div>
            <div class="hs-ray"></div>
            <div class="hs-ray"></div>
            <div class="hs-ray"></div>
          </div>
          <div class="hs-sun-body">
            <div class="hs-sun-face">
              <div class="hs-eyes">
                <div class="hs-eye"></div>
                <div class="hs-eye"></div>
              </div>
            </div>
            <div class="hs-smile"></div>
          </div>
        </div>
        <p class="hs-healing-message">但在这里，太阳为你而亮</p>
        <div class="hs-rain-info">
          <span id="hs-rain-city"></span>
          <span class="hs-rain-divider">·</span>
          <span id="hs-rain-temp"></span>
        </div>
      </div>
    </div>
    <div class="hs-actions" id="hs-actions" style="display:none;">
      <button class="hs-action-btn" id="hs-refresh" title="刷新天气">🔄</button>
      <button class="hs-action-btn" id="hs-relocate" title="重新定位">📍</button>
    </div>
  `;
  document.body.appendChild(widget);

  // ===== DOM 引用 =====
  const $ = (id) => document.getElementById(id);
  const el = {
    loading: $('hs-loading'),
    manual: $('hs-manual'),
    normal: $('hs-normal'),
    rain: $('hs-rain'),
    actions: $('hs-actions'),
    cityName: $('hs-city-name'),
    weatherIcon: $('hs-weather-icon'),
    temperature: $('hs-temperature'),
    weatherDesc: $('hs-weather-desc'),
    humidity: $('hs-humidity'),
    wind: $('hs-wind'),
    updateTime: $('hs-update-time'),
    rainCity: $('hs-rain-city'),
    rainTemp: $('hs-rain-temp'),
    error: $('hs-error'),
    cityInput: $('hs-city-input'),
  };

  function showView(name) {
    el.loading.classList.add('hidden');
    el.manual.classList.add('hidden');
    el.normal.classList.add('hidden');
    el.rain.classList.add('hidden');
    if (name === 'loading') { el.loading.classList.remove('hidden'); el.actions.style.display = 'none'; }
    else if (name === 'manual') { el.manual.classList.remove('hidden'); el.actions.style.display = 'none'; }
    else if (name === 'normal') { el.normal.classList.remove('hidden'); el.actions.style.display = 'flex'; }
    else if (name === 'rain') { el.rain.classList.remove('hidden'); el.actions.style.display = 'flex'; }
  }

  let lastCityInfo = null;

  async function fetchAndRender(manualCity) {
    try {
      let cityInfo;
      if (manualCity) {
        cityInfo = await geocodeCity(manualCity);
      } else {
        const detected = await getLocation();
        if (!detected) { showView('manual'); return; }
        cityInfo = await geocodeCity(detected);
      }
      lastCityInfo = cityInfo;
      const weather = await getRealtimeWeather(cityInfo.lat, cityInfo.lon);

      const label = cityInfo.admin1 ? `${cityInfo.admin1} · ${cityInfo.name}` : cityInfo.name;
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (isRaining(weather.code)) {
        el.rainCity.textContent = label;
        el.rainTemp.textContent = `${weather.temp}°C · ${codeToText(weather.code)}`;
        showView('rain');
      } else {
        el.cityName.textContent = label;
        el.weatherIcon.textContent = codeToEmoji(weather.code);
        el.temperature.textContent = weather.temp;
        el.weatherDesc.textContent = codeToText(weather.code);
        el.humidity.textContent = `${weather.humidity}%`;
        el.wind.textContent = `${weather.windSpeed} km/h`;
        el.updateTime.textContent = `更新于 ${timeStr}`;
        showView('normal');
      }
    } catch (err) {
      console.error('[治愈太阳]', err);
      showView('manual');
      el.error.textContent = err.name === 'AbortError' ? '请求超时' : (err.message || '网络连接失败');
      el.error.classList.remove('hidden');
    }
  }

  // ===== 拖拽 =====
  const dragBar = $('hs-drag-bar');
  let isDragging = false;
  let dragStartX, dragStartY, widgetStartX, widgetStartY;

  dragBar.addEventListener('mousedown', (e) => {
    if (e.target.id === 'hs-close-btn') return;
    isDragging = true;
    widget.classList.add('dragging');
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = widget.getBoundingClientRect();
    widgetStartX = rect.left;
    widgetStartY = rect.top;
    widget.style.right = 'auto';
    widget.style.left = widgetStartX + 'px';
    widget.style.top = widgetStartY + 'px';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    widget.style.left = (widgetStartX + dx) + 'px';
    widget.style.top = (widgetStartY + dy) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      widget.classList.remove('dragging');
    }
  });

  // ===== 事件 =====
  $('hs-close-btn').addEventListener('click', () => {
    widget.style.display = 'none';
  });

  $('hs-refresh').addEventListener('click', () => {
    showView('loading');
    fetchAndRender(lastCityInfo?.name);
  });

  $('hs-relocate').addEventListener('click', () => {
    showView('loading');
    fetchAndRender();
  });

  $('hs-search-btn').addEventListener('click', () => {
    const city = el.cityInput.value.trim();
    if (!city) return;
    el.error.classList.add('hidden');
    showView('loading');
    fetchAndRender(city);
  });

  el.cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('hs-search-btn').click();
  });

  // ===== 启动 =====
  fetchAndRender();
})();
