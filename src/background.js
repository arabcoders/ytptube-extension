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

    console.debug(`Sending to '${instanceUrl}'.`, data, headers.length > 0 ? 'with auth header' : 'without auth header');

    let opts = {method: data.length > 0 ? 'POST' : 'GET', headers: headers};

    if (data) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(data);
    }

    const req = await fetch(url, opts);
    return {status: req.status, statusText: req.statusText, data: req};
};

const sendUrl = async user_url => {
    try {
        const data = await sendRequest('/api/history', {url: user_url});
        if (200 === data.status) {
            notify('Request sent successfully.');
            return
        }
        notify(`Failed to send request. '${data.status}: ${data.statusText}'.`);
    }catch (e) {
        console.error(e);
        notify(`Failed to send request. '${e.message}'.`);
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

    await sendUrl(info.linkUrl);
});

chrome.runtime.onMessage.addListener(async (message) => {
    if (message.command !== "send-to-ytptube") {
        return;
    }

    let url = message.url || await getCurrentUrl();

    if (!url) {
        await notify('No url found');
        return;
    }

    await sendUrl(url);
});



