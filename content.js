let keywords = [];
let excludedSites = [];
let isActive = false;
let separator = ',';

function highlightKeywords() {
  if (!isActive || keywords.length === 0 || isExcludedSite()) {
    removeHighlights();
    return;
  }

  removeHighlights();

  const colorMap = new Map(keywords.map(keyword => {
    const bgColor = getRandomColor();
    const textColor = getContrastColor(bgColor);
    return [keyword, { bg: bgColor, text: textColor }];
  }));
  
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.textContent;
      let matches = [];
      
      // 查找所有匹配
      keywords.forEach(keyword => {
        if (!keyword) return;
        const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          matches.push({
            start: match.index,
            end: regex.lastIndex,
            keyword: keyword
          });
        }
      });
      
      // 如果没有匹配，返回
      if (matches.length === 0) return;
      
      // 按开始位置排序
      matches.sort((a, b) => a.start - b.start);
      
      // 合并重叠区间
      let mergedMatches = [matches[0]];
      for (let i = 1; i < matches.length; i++) {
        let current = matches[i];
        let last = mergedMatches[mergedMatches.length - 1];
        if (current.start <= last.end) {
          last.end = Math.max(last.end, current.end);
          last.keyword = last.keyword.length > current.keyword.length ? last.keyword : current.keyword;
        } else {
          mergedMatches.push(current);
        }
      }
      
      // 创建文档片段
      let fragment = document.createDocumentFragment();
      let lastIndex = 0;
      
      mergedMatches.forEach(match => {
        // 添加匹配之前的文本
        if (match.start > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.start)));
        }
        
        // 创建高亮的 span
        const span = document.createElement('span');
        const colors = colorMap.get(match.keyword);
        span.style.backgroundColor = colors.bg;
        span.style.color = colors.text;
        span.className = 'keyword-highlighter';
        span.textContent = text.slice(match.start, match.end);
        fragment.appendChild(span);
        
        lastIndex = match.end;
      });
      
      // 添加剩余的文本
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      
      // 替换原始节点
      node.parentNode.replaceChild(fragment, node);
    } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.nodeName)) {
      Array.from(node.childNodes).forEach(processNode);
    }
  }

  processNode(document.body);
}

function isExcludedSite() {
  return excludedSites.some(site => {
    const regex = new RegExp(site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return regex.test(window.location.href);
  });
}

function removeHighlights() {
  const highlights = document.querySelectorAll('.keyword-highlighter');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
    parent.normalize();
  });
}

function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 100%, 80%)`;  // 使用 HSL 颜色模型，固定饱和度和亮度
}

function getContrastColor(bgColor) {
  // 将 HSL 转换为 RGB
  let [h, s, l] = bgColor.match(/\d+/g).map(Number);
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  const rgb = [f(0), f(8), f(4)].map(x => Math.round(x * 255));
  
  // 计算亮度
  const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  
  // 根据背景亮度选择文字颜色
  return brightness > 128 ? '#000000' : '#FFFFFF';
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "updateSettings") {
    keywords = request.keywords || [];
    excludedSites = request.excludedSites || [];
    isActive = request.isActive;
    separator = request.separator || ',';
    
    highlightKeywords();
  }
});

// 初始化
chrome.storage.local.get(['keywords', 'excludedSites', 'isActive', 'separator'], function(data) {
  keywords = data.keywords || [];
  excludedSites = data.excludedSites || [];
  isActive = data.isActive || false;
  separator = data.separator || ',';
  if (isActive) {
    highlightKeywords();
  }
});
