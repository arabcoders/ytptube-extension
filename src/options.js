// noinspection JSUnresolvedReference

const str_keys = ["instance_url", "preset", "template", "folder", "username", "password"]

const $ = s => document.querySelector(s)

if (typeof chrome === 'undefined') {
    let chrome = browser
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

document.getElementById("ytptube_options").addEventListener("submit", (e) => {
    e.preventDefault();

    let showContextMenu = document.querySelector("#showContextMenu").checked;

    let data = {}

    str_keys.forEach(key => data[key] = document.querySelector(`#${key}`).value)
    data["showContextMenu"] = showContextMenu
    chrome.storage.sync.set(data);
    chrome.contextMenus.update("send-to-ytptube", {visible: showContextMenu});

    chrome.notifications.create({
        "type": "basic",
        "iconUrl": chrome.runtime.getURL("icons/icon-128.png"),
        "title": 'YTPTube Extension',
        "message": "Options saved."
    });

    setTimeout(() => window.close(), 1000);
});