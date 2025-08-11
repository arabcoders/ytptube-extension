// noinspection JSUnresolvedReference

const $ = s => document.querySelector(s)

if (typeof chrome === 'undefined') {
    let chrome = browser;
}

const getOption = async (key, default_data) => {
    let item = await chrome.storage.sync.get(key);
    return item[key] || default_data;
}

const notify = message => chrome.notifications.create({
    "type": "basic",
    "iconUrl": chrome.runtime.getURL("icons/icon-128.png"),
    "title": 'YTPTube Extension',
    "message": message
});

const showLoading = (isLoading) => {
    const submitBtn = $('#submit-btn')
    
    if (isLoading) {
        submitBtn.disabled = true
        submitBtn.classList.add('is-loading')
    } else {
        submitBtn.disabled = false
        submitBtn.classList.remove('is-loading')
    }
}

const showStatusMessage = (message, isSuccess = true) => {
    const statusDiv = $('#status-message')
    statusDiv.textContent = message
    statusDiv.className = `notification ${isSuccess ? 'is-success' : 'is-danger'}`
    statusDiv.classList.remove('is-hidden')
    
    // Hide the message after 3 seconds
    setTimeout(() => {
        statusDiv.classList.add('is-hidden')
    }, 3000)
}

$("#ytptube_popup").addEventListener("submit", async (e) => {
    e.preventDefault()
    const url = $('#user_url').value
    const preset = $('#preset').value
    if (!url) {
        showStatusMessage('URL is required.', false)
        return
    }

    showLoading(true)
    
    try {
        const response = await chrome.runtime.sendMessage({command: 'send-to-ytptube', url: url, preset: preset})
        
        if (response && response.success) {
            showStatusMessage('Request sent successfully!', true)
        } else {
            showStatusMessage(response?.message || 'Failed to send request.', false)
        }
    } catch (error) {
        showStatusMessage('Error sending request.', false)
        console.error('Error:', error)
    } finally {
        showLoading(false)
    }
})

const getCurrentUrl = async () => (await chrome.tabs.query({currentWindow: true, active: true}))[0].url

addEventListener('DOMContentLoaded', async _ => {
    let url = await getCurrentUrl()

    if (url && !url.startsWith('http')) {
        url = ""
    }

    $('#user_url').value = url || ''

    const defaultPreset = await getOption("preset")

    const cache = await getOption('presets', {
        presets: [],
        last_updated: 0
    })

    if (Date.now() - cache.last_updated > 1000 * 60 * 60) {
        cache.presets = await getPresets()
        cache.last_updated = Date.now()
        await chrome.storage.sync.set({presets: cache})
    }

    const s = $('#preset')

    // -- remove existing options
    while (s.firstChild) {
        s.removeChild(s.lastChild);
    }

    cache.presets.forEach(p => {
        let option = document.createElement('option');
        option.value = p;
        option.text = p;
        // -- set the default preset
        if (p === defaultPreset) {
            option.selected = true;
        }
        s.appendChild(option);
    })
})

$('#go-to-options').addEventListener('click', function () {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('options.html'));
    }
});

$('#preset').addEventListener('change', async e => await chrome.storage.sync.set({preset: e.target.value}))

const getPresets = async () => {
    let presets = []

    const instanceUrl = await getOption("instance_url");
    if (!instanceUrl) {
        presets.push('YTPTube instance url not configured.');
        return presets
    }

    let headers = {};

    const auth_username = await getOption('username');
    const auth_password = await getOption('password');
    if (auth_username && auth_password) {
        headers['Authorization'] = 'Basic ' + btoa(`${auth_username}:${auth_password}`);
    }

    const url = new URL(instanceUrl);
    url.pathname = '/api/presets';
    url.search = 'filter=name';

    const req = await fetch(url, {method: 'GET', headers: {...headers, 'Accept': 'application/json'}});
    if (200 !== req.status) {
        presets.push('Error fetching presets from YTPTube.');
        return presets
    }

    (await req.json()).forEach(preset => presets.push(preset.name))

    return presets
};