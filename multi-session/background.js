const targetDomains = ["example.com", "test.com"]; // 要隔离的域名

chrome.tabs.onCreated.addListener(async (newTab) => {
    const domain = new URL(newTab.url).hostname;
    if (!targetDomains.includes(domain)) return;

    await chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        func: setCookiePrefix
    });

    async function setCookiePrefix() {
        const cookieStoreId = await chrome.cookies.getAllCookieStores().then(cookieStores =>
            cookieStores.find(store => store.type === 'regular' && store.siteInstance === newTab.url)
        );

        if (!cookieStoreId) return;

        chrome.webRequest.onBeforeSendHeaders.addListener(
            modifyCookieHeaders,
            {
                urls: ['<all_urls>'],
                types: [ main_frame]
            },
            ['blocking', 'requestHeaders']
        );
    }

    function modifyCookieHeaders(details) {
        const headers = [...details.requestHeaders];
        const cookieHeaderIndex = headers.findIndex(header => header.name.toLowerCase() === "cookie");

        if (cookieHeaderIndex !== -1) {
            const cookieHeaderValue = details.requestHeaders[cookieHeaderIndex].value;
            const prefixedCookies = cookieHeaderValue.split("; ")
                .map(cookie => cookie.trim().startsWith("prefix_") ? cookie : `prefix_${cookie}`)
                .join("; ");

            headers[cookieHeaderIndex] = { ...headers[cookieHeaderIndex], value: prefixedCookies };

            return { requestHeaders: headers };
        }

        return { requestHeaders: headers };
    }
});

chrome.webRequest.onCompleted.addListener(
    details => {
        if (!targetDomains.includes(new URL(details.url).hostname)) return; // 如果不是隔离的域名，则跳过

        chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            func: prefixLocalStorageAndSessionStorage
        });
    },
    { types: ["localstorage", "sessionstorage"] }
);

async function prefixLocalStorageAndSessionStorage() {
    const storageArea = details.type === "localstorage" ? "localStorage" : "sessionStorage";

    Object.keys(window[storageArea]).forEach(key => {
        if (!key.startsWith('prefix_')) {
            window[storageArea].setItem('prefix_' + key, window[storageArea].getItem(key));
            window[storageArea].removeItem(key);
        }
    });
}