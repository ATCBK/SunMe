(function () {
  // 已存在则切换
  const old = document.getElementById('healing-sun-widget');
  if (old) {
    if (old.style.display === 'none') {
      old.classList.remove('hiding');
      old.style.display = 'block';
    } else {
      old.classList.add('hiding');
      setTimeout(function () { old.style.display = 'none'; }, 400);
    }
    return;
  }

  // 波浪 SVG 路径
  var waveSVG = '<svg class="hs-wave-ring" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M80 8 C95 2, 110 8, 118 18 C126 28, 135 35, 140 50 C145 65, 152 75, 152 80 C152 95, 145 110, 135 118 C125 126, 118 135, 110 140 C100 146, 90 152, 80 152 C65 152, 50 145, 42 135 C34 125, 25 118, 18 110 C10 100, 8 90, 8 80 C8 65, 15 50, 25 42 C35 34, 42 25, 50 18 C60 10, 70 5, 80 8Z" ' +
    'stroke="#FFD36E" stroke-width="2" fill="none" opacity="0.5"/>' +
    '<path d="M80 18 C92 14, 105 18, 112 26 C120 35, 128 40, 132 52 C136 64, 142 72, 142 80 C142 92, 136 105, 128 112 C120 119, 112 128, 105 132 C96 137, 88 142, 80 142 C68 142, 55 136, 48 128 C40 120, 32 112, 26 105 C19 96, 18 88, 18 80 C18 68, 24 55, 32 48 C40 40, 48 32, 55 26 C63 19, 72 15, 80 18Z" ' +
    'stroke="#FFB833" stroke-width="1.5" fill="none" opacity="0.35"/>' +
    '</svg>';

  // 创建 DOM
  var el = document.createElement('div');
  el.id = 'healing-sun-widget';
  el.innerHTML =
    '<div class="hs-wrap">' +
      waveSVG +
      '<div class="hs-rays">' +
        '<div class="hs-ray"></div><div class="hs-ray"></div>' +
        '<div class="hs-ray"></div><div class="hs-ray"></div>' +
        '<div class="hs-ray"></div><div class="hs-ray"></div>' +
        '<div class="hs-ray"></div><div class="hs-ray"></div>' +
        '<div class="hs-ray"></div><div class="hs-ray"></div>' +
        '<div class="hs-ray"></div><div class="hs-ray"></div>' +
      '</div>' +
      '<div class="hs-body">' +
        '<div class="hs-eyes">' +
          '<div class="hs-eye"></div>' +
          '<div class="hs-eye"></div>' +
        '</div>' +
        '<div class="hs-smile"></div>' +
      '</div>' +
      '<button class="hs-loc-btn" title="设置地区">📍</button>' +
      '<div class="hs-loc-popup" id="hs-loc-popup">' +
        '<input type="text" id="hs-loc-input" placeholder="输入城市名 如 北京">' +
        '<div class="hs-loc-hint">留空则自动定位</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(el);

  var locBtn = el.querySelector('.hs-loc-btn');
  var locPopup = document.getElementById('hs-loc-popup');
  var locInput = document.getElementById('hs-loc-input');

  // 点地区按钮 → 弹出输入框
  locBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    locPopup.classList.toggle('show');
    if (locPopup.classList.contains('show')) {
      locInput.focus();
    }
  });

  // 回车确认
  locInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var city = locInput.value.trim();
      locPopup.classList.remove('show');
      if (city) {
        // 保存城市到 chrome.storage，下次插件加载时读取
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ hs_city: city });
        }
      } else {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.remove('hs_city');
        }
      }
    }
  });

  // 点击太阳外部关闭弹窗
  document.addEventListener('click', function (e) {
    if (!el.contains(e.target)) {
      locPopup.classList.remove('show');
    }
  });

  // 拖拽
  var dragging = false, moved = false, sx, sy, ox, oy;
  el.addEventListener('mousedown', function (e) {
    if (e.target === locInput || e.target === locBtn) return;
    dragging = true; moved = false;
    sx = e.clientX; sy = e.clientY;
    var r = el.getBoundingClientRect();
    ox = r.left; oy = r.top;
    el.style.left = ox + 'px';
    el.style.top = oy + 'px';
    e.preventDefault();
  });
  document.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
    el.style.left = (ox + dx) + 'px';
    el.style.top = (oy + dy) + 'px';
  });
  document.addEventListener('mouseup', function () { dragging = false; });

  // 点击太阳本体收缩（拖拽不算）
  el.addEventListener('click', function (e) {
    if (moved) return;
    if (e.target === locInput || e.target === locBtn || locPopup.contains(e.target)) return;
    el.classList.add('hiding');
    setTimeout(function () { el.style.display = 'none'; }, 400);
  });
})();
