// noinspection JSUnresolvedReference

const str_keys = ["instance_url", "preset", "template", "folder", "username", "password"]

if (typeof chrome === 'undefined') {
    let chrome = browser
}

const notify = (message, no_inline) => {
    if (!no_inline) {
        document.querySelector('#error_msg').innerText = message;
    }

    chrome.notifications.create({
        "type": "basic",
        "iconUrl": chrome.runtime.getURL("icons/icon-128.png"),
        "title": 'YTPTube Extension',
        "message": message,
    });
}

const testConfig = async () => {

    document.querySelector('#error_msg').innerText = "";

    let instance_url = document.querySelector("#instance_url").value;
    if (!instance_url) {
        notify("Please enter a valid YTPTube instance URL.");
        return false;
    }

    if (instance_url.endsWith('/')) {
        instance_url = instance_url.slice(0, -1);
    }

    let username = document.querySelector("#username").value;
    let password = document.querySelector("#password").value;

    let headers = {}
    if (username && password) {
        headers['Authorization'] = 'Basic ' + btoa(username + ':' + password);
    }

    try {
        const req = await fetch(`${instance_url}/api/ping`, {
            method: 'GET',
            headers: headers
        });

        if (200 === req.status) {
            notify("Connection successful.", true);
            return true;
        }

        const json = await req.json();
        notify(json.error ?? "Unknown error.");
    } catch (e) {
        notify("Error: " + e);
    }
    return false;
}

document.addEventListener("DOMContentLoaded", () => {
    function onError(error) {
        console.log(`Error: ${error}`);
    }

    str_keys.forEach(k => {
        chrome.storage.sync.get(k).then(r => document.querySelector(`#${k}`).value = r[k] || "", onError);
    });

    chrome.storage.sync.get("showContextMenu").then(r => document.querySelector("#showContextMenu").checked = r.showContextMenu || false);
});

document.getElementById("ytptube_options").addEventListener("submit", async e => {
    e.preventDefault();

    if (false === (await testConfig())) {
        return false;
    }

    let showContextMenu = document.querySelector("#showContextMenu").checked;

    let data = {presets: {presets: ['default'], last_updated: 0}}

    str_keys.forEach(key => data[key] = document.querySelector(`#${key}`).value)
    data["showContextMenu"] = showContextMenu
    chrome.storage.sync.set(data);
    chrome.contextMenus.update("send-to-ytptube", {visible: showContextMenu});

    notify("Options saved.", true);

    setTimeout(() => {
        try {
            window.close()
        } catch (e) {
        }
    }, 1000);
});

document.getElementById("test_config").addEventListener("click", async e => {
    e.preventDefault();
    await testConfig();
});