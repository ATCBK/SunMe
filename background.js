// 点击插件图标时，向当前页面注入/切换浮窗
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // 先检查浮窗是否已经注入
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => !!document.getElementById('healing-sun-widget'),
    });

    if (result?.result) {
      // 已存在，切换显示/隐藏
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const widget = document.getElementById('healing-sun-widget');
          if (widget) {
            widget.style.display = widget.style.display === 'none' ? 'flex' : 'none';
          }
        },
      });
      return;
    }
  } catch (e) {
    return;
  }

  // 注入浮窗
  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['widget/widget.css'],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['widget/widget.js'],
    });
  } catch (e) {
    // 某些页面无法注入（如 chrome:// 页面）
    console.warn('无法在此页面注入浮窗:', e.message);
  }
});
