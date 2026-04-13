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
