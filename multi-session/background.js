chrome.declarativeNetRequest.updateDynamicRuleset(
    1,
    { base: chrome.runtime.getURL('rules.json') },
    () => {
        console.log('Dynamic ruleset registered');
    }
);