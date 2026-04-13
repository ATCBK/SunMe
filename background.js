chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // 检查是否已存在
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => !!document.getElementById('healing-sun-widget'),
    });

    if (result?.result) {
      // 切换显示/隐藏
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const w = document.getElementById('healing-sun-widget');
          if (w.style.display === 'none') {
            w.classList.remove('hiding');
            w.style.display = 'block';
          } else {
            w.classList.add('hiding');
            setTimeout(() => { w.style.display = 'none'; }, 400);
          }
        },
      });
      return;
    }
  } catch { return; }

  // 注入 CSS 再注入 JS
  try {
    const cssUrl = chrome.runtime.getURL('widget/widget.css');
    const resp = await fetch(cssUrl);
    const css = await resp.text();
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, css });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['widget/widget.js'] });
  } catch (e) {
    console.warn('注入失败:', e.message);
  }
});

// 监听内容脚本的消息（天气查询、定位）
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'fetchWeather') {
    handleWeather(msg, sendResponse);
    return true; // 异步响应
  }
  if (msg.type === 'fetchLocation') {
    handleLocation(sendResponse);
    return true;
  }
});

// 通过城市名查天气
async function handleWeather(msg, sendResponse) {
  try {
    // 第一步：城市名 → 经纬度
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(msg.city)}&count=1&language=zh`;
    const geoResp = await fetch(geoUrl);
    const geoData = await geoResp.json();

    if (!geoData.results || geoData.results.length === 0) {
      sendResponse({ error: '未找到城市: ' + msg.city });
      return;
    }

    const loc = geoData.results[0];

    // 第二步：经纬度 → 天气
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
    const weatherResp = await fetch(weatherUrl);
    const weatherData = await weatherResp.json();

    const current = weatherData.current;
    sendResponse({
      city: loc.name + (loc.admin1 ? ', ' + loc.admin1 : ''),
      country: loc.country,
      temp: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      weatherCode: current.weather_code,
      isRaining: isRainCode(current.weather_code),
      description: weatherCodeToText(current.weather_code),
    });
  } catch (e) {
    sendResponse({ error: '天气查询失败: ' + e.message });
  }
}

// 通过 IP 获取定位
async function handleLocation(sendResponse) {
  try {
    const resp = await fetch('https://ipinfo.io/json');
    const data = await resp.json();
    sendResponse({ city: data.city, region: data.region, country: data.country });
  } catch {
    // 备用接口
    try {
      const resp = await fetch('https://www.vore.top/api/IPdata.php');
      const data = await resp.json();
      sendResponse({ city: data.data.city || '' });
    } catch (e) {
      sendResponse({ error: '定位失败' });
    }
  }
}

// WMO 天气代码判断是否下雨 (50-69 为降水类)
function isRainCode(code) {
  return code >= 51 && code <= 67 || code >= 80 && code <= 82 || code >= 95 && code <= 99;
}

// WMO 天气代码转中文描述
function weatherCodeToText(code) {
  const map = {
    0: '晴',
    1: '大部晴',
    2: '多云',
    3: '阴',
    45: '雾',
    48: '雾凇',
    51: '小毛毛雨',
    53: '中毛毛雨',
    55: '大毛毛雨',
    56: '冻毛毛雨',
    57: '冻毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    66: '冻雨',
    67: '冻雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    77: '雪粒',
    80: '小阵雨',
    81: '中阵雨',
    82: '大阵雨',
    85: '小阵雪',
    86: '大阵雪',
    95: '雷暴',
    96: '雷暴伴冰雹',
    99: '雷暴伴大冰雹',
  };
  return map[code] || '未知';
}
