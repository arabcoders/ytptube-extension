// noinspection JSUnresolvedReference

const str_keys = ["instance_url", "preset", "template", "folder", "username", "password"]
const bool_keys = ["showContextMenu"]

if (typeof chrome === 'undefined') {
    let chrome = browser
}

const notify = message => chrome.notifications.create({
    "type": "basic",
    "iconUrl": chrome.runtime.getURL("icons/icon-128.png"),
    "title": 'YTPTube Extension',
    "message": message,
});

const onMenuCreated = () => {
    if (chrome.runtime.lastError) {
        console.log(`error creating menu item. ${chrome.runtime.lastError}`);
    }
    syncContextMenu().then(_ => '').catch(console.error);
}

const shouldShowContextMenu = async () => {
    let item = await chrome.storage.sync.get("showContextMenu");
    return 'showContextMenu' in item ? item.showContextMenu : true;
};

const syncContextMenu = async () => {
    let showContextMenu = await shouldShowContextMenu();
    chrome.contextMenus.update("send-to-ytptube", {visible: showContextMenu});
}

chrome.contextMenus.create({
    id: "send-to-ytptube",
    title: "Send to YTPTube",
    contexts: ["link"]
}, onMenuCreated);

const getCurrentUrl = async () => (await chrome.tabs.query({currentWindow: true, active: true}))[0].url

const getOption = async key => {
    let item = await chrome.storage.sync.get(key);
    if (str_keys.includes(key)) {
        return item[key] ?? '';
    }
    if (bool_keys.includes(key)) {
        return item[key] ?? false;
    }
}

const sendRequest = async (path, data) => {
    let instanceUrl = await getOption("instance_url");
    if (!instanceUrl) {
        throw new Error('YTPTube instance url not configured.');
    }

    if (instanceUrl.endsWith('/')) {
        instanceUrl = instanceUrl.slice(0, -1);
    }

    let headers = {};

    const auth_username = await getOption("username");
    const auth_password = await getOption("password");
    if (auth_username && auth_password) {
        headers['Authorization'] = 'Basic ' + btoa(`${auth_username}:${auth_password}`);
    }

    const url = new URL(instanceUrl);
    url.pathname = path;

    let opts = {method: Object.keys(data).length > 0 ? 'POST' : 'GET', headers: headers};

    if (data) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(data);
    }

    console.debug(`Sending to '${instanceUrl}'.`, opts, headers.length > 0 ? 'with auth header' : 'without auth header');

    const req = await fetch(url, opts);
    return {status: req.status, statusText: req.statusText, data: req};
};

const sendUrl = async (user_url, preset = null) => {
    try {
        const requestData = {url: user_url};
        if (preset) {
            requestData.preset = preset;
        }
        
        // Add template and folder if configured
        const template = await getOption("template");
        if (template) {
            requestData.template = template;
        }
        
        const folder = await getOption("folder");
        if (folder) {
            requestData.folder = folder;
        }
        
        console.debug('Sending request data:', requestData);
        
        const data = await sendRequest('/api/history', requestData);
        if (200 === data.status) {
            notify('Request sent successfully.');
            return { success: true, message: 'Request sent successfully.' };
        }
        const errorMessage = `Failed to send request. '${data.status}: ${data.statusText}'.`;
        notify(errorMessage);
        return { success: false, message: errorMessage };
    }catch (e) {
        console.error(e);
        const errorMessage = `Failed to send request. '${e.message}'.`;
        notify(errorMessage);
        return { success: false, message: errorMessage };
    }
};

chrome.contextMenus.onClicked.addListener(async (info, _) => {
    if (info.menuItemId !== "send-to-ytptube") {
        return;
    }
    if (!info.linkUrl) {
        notify('No link url found');
        return;
    }

    // Get the default preset for context menu actions
    const defaultPreset = await getOption("preset");
    await sendUrl(info.linkUrl, defaultPreset);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command !== "send-to-ytptube") {
        return;
    }

    (async () => {
        try {
            let url = message.url || await getCurrentUrl();

            if (!url) {
                await notify('No url found');
                sendResponse({ success: false, message: 'No url found' });
                return;
            }

            const result = await sendUrl(url, message.preset);
            sendResponse(result);
        } catch (error) {
            console.error('Error in message handler:', error);
            sendResponse({ success: false, message: error.message });
        }
    })();

    return true; // Keep the messaging channel open for async response
});



