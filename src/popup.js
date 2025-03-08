// noinspection JSUnresolvedReference

const $ = s => document.querySelector(s)

if (typeof chrome === 'undefined') {
    let chrome = browser
}

const notify = message => chrome.notifications.create({
    "type": "basic",
    "iconUrl": chrome.runtime.getURL("icons/icon-128.png"),
    "title": 'YTPTube Extension',
    "message": message
});

$("#ytptube_popup").addEventListener("submit", async (e) => {
    e.preventDefault()
    const url = $('#user_url').value
    if (!url) {
        notify('URL is required.')
        return
    }

    await chrome.runtime.sendMessage({command: 'send-to-ytptube', url: url})
})

const getCurrentUrl = async () => (await chrome.tabs.query({currentWindow: true, active: true}))[0].url

addEventListener('DOMContentLoaded', async _ => {
    let url = await getCurrentUrl()

    if (url && !url.startsWith('http')) {
        url = ""
    }

    $('#user_url').value = url || ''
})

$('#go-to-options').addEventListener('click', function () {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('options.html'));
    }
});