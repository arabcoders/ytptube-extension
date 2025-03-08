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

const sendRequest = async user_url => {
    const instanceUrl = await getOption("instance_url");
    if (!instanceUrl) {
        notify('YTPTube instance url not configured.');
        return;
    }

    let headers = {};
    let data = {
        url: user_url,
    }

    const auth_username = await getOption("username");
    const auth_password = await getOption("password");
    if (auth_username && auth_password) {
        headers['Authorization'] = 'Basic ' + btoa(`${auth_username}:${auth_password}`);
    }

    const preset = await getOption("preset");
    if (preset) {
        data['preset'] = preset;
    }

    const template = await getOption("template");
    if (template) {
        data['template'] = template;
    }

    const folder = await getOption("folder");
    if (folder) {
        data['folder'] = folder;
    }

    console.debug(`Sending to '${instanceUrl}'.`, data, headers.length > 0 ? 'with auth header' : 'without auth header');

    const url = new URL(instanceUrl);
    url.pathname = '/api/history';

    const req = await fetch(url, {
        method: 'POST',
        headers: {
            ...headers,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });

    if (200 === req.status) {
        notify('Request sent successfully.');
        return
    }

    notify(`Failed to send request. '${req.status}: ${req.statusText}'.`);
};

chrome.contextMenus.onClicked.addListener(async (info, _) => {
    if (info.menuItemId !== "send-to-ytptube") {
        return;
    }
    if (!info.linkUrl) {
        notify('No link url found');
        return;
    }

    await sendRequest(info.linkUrl);
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

    await sendRequest(url);
});



