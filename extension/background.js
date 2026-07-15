// FileFlick Chrome Extension - Background Worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "convertToPNG",
    title: "Convert to PNG",
    contexts: ["image"],
  });
  chrome.contextMenus.create({
    id: "convertToJPG",
    title: "Convert to JPG",
    contexts: ["image"],
  });
  chrome.contextMenus.create({
    id: "convertToWebP",
    title: "Convert to WebP",
    contexts: ["image"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith("convertTo")) {
    const format = info.menuItemId.replace("convertTo", "").toLowerCase();
    const imageUrl = info.srcUrl;
    
    // For MVP: Downloads the original but we will upgrade this to use canvas conversion soon.
    chrome.downloads.download({
      url: imageUrl,
      filename: `FileFlick_Converted.${format}`,
    });
  }
});

console.log("FileFlick Extension is ready.");
