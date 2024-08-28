'use strict';

import {S, svgToBase64, toSvgString} from './util.js';

function downloadSvg(event, xml) {
    event.target.href = svgToBase64(xml);
}

function downloadJpg(event, size, xml) {
    let canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const img = new Image();
    img.src = svgToBase64(xml);
    img.onload = () => {
        canvas.getContext('2d').drawImage(img, 0, 0);
        event.target.href = canvas.toDataURL('image/jpeg');
    };
}

function clearForm() {
    const resetInput = (input) => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = false;
        } else {
            input.value = input.defaultValue;
        }
    };
    S('input', true).forEach(resetInput);
    S('textarea', true).forEach(textarea => textarea.value = textarea.defaultValue);
    S('.preview', true).forEach(preview => preview.innerHTML = '-');
    S('select', true).forEach(select => select.selectedIndex = null);
    S('#qr-preview').innerHTML = '<p>PREVIEW</p>';
}

function addTabs(root) {
    const tabs = root.querySelectorAll('.tabs ul li');
    const tabContents = root.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('is-active'));
            tab.classList.add('is-active');

            const target = tab.getAttribute('data-tab');
            tabContents.forEach(content => {
                content.classList.toggle('is-active', content.id === target);
            });
        });
    });
}

function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}
function initializeEvents() {
    /* download as svg */
    S('#download-svg').addEventListener('click', (event) => {
        downloadSvg(event, S('#qr-preview').innerHTML);
    });

    /* download as jpg */
    S('#download-jpg').addEventListener('click', (event) => {
       downloadJpg(event, parseInt(S('#qr-size').value), S('#qr-preview').innerHTML);
    });

    S('#btn-reset').addEventListener('click', clearForm);

    /* generate preview */
    const updatePreviewDebounced = debounce(updateLivePreview, 300);
    document.querySelectorAll('.live-update-input').forEach(title => {
        title.addEventListener('input', () => {
            updatePreviewDebounced();
        });
    });
    document.querySelectorAll('.live-update-change').forEach(title => {
        title.addEventListener('change', () => {
            updatePreviewDebounced();
        });
    });

    /* switch tabs */
    document.querySelectorAll('.settings').forEach(addTabs);
}

document.addEventListener('DOMContentLoaded', initializeEvents);

function getMaxCharCount(error_level) {
    return {
        L: 2953,
        M: 2331,
        Q: 1663,
        H: 1273
    }[error_level] || 2953;
}

function getText(text, maxCharCount) {
    return text.slice(0, maxCharCount);
}

function getUrlText(url) {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
        url = 'https://' + url;
    }
    return url;
}

function getVCardText(firstname, surename, orga, title, phoneCell, phoneWork, phoneHome, emailHome, emailWork, address, website) {
    // for ref https://goqr.me/de/qr-codes/typ-vcard.html#:~:text=Geben%20Sie%20Telefonnummern%20in%20vCards,Statt%200151%20123456%20also%20%2B49151123456.
    const vcard = [
        'BEGIN:VCARD',
        'VERSION:2.1',
        firstname && surename && `FN:${firstname} ${surename}`,
        firstname && surename && `N:${surename};${firstname}`,
        title && `TITLE:${title}`,
        phoneCell && `TEL;CELL:${phoneCell}`,
        phoneWork && `TEL;WORK;VOICE:${phoneWork}`,
        phoneHome && `TEL;HOME;VOICE:${phoneHome}`,
        emailHome && `EMAIL;HOME;INTERNET:${emailHome}`,
        emailWork && `EMAIL;WORK;INTERNET:${emailWork}`,
        website && `URL:${website}`,
        address && `ADR:${address.split('\n').join(';')}`,
        orga && `ORG:${orga}`,
        'END:VCARD'
    ].filter(Boolean);
    
    return vcard.join('\n');
}

function getWifiText(ssid, password, encryption, hidden) {
    return `WIFI:S:${ssid};T:${encryption};P:${password};${hidden ? 'H:HIDDEN' : ''};`;
}

function getMailText(recipient, subject, body) {
    return `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function getSMSText(phone, message) {
    return `sms:${phone}?body=${message}`;
}

function getTextByTab(activeTab) {
    let text = '';
    switch(activeTab) {
        case 'tab-text':
            const maxCharCount = getMaxCharCount(S('#qr-error-level').value);
            const textElement = S('#qr-text');
            text = getText(textElement.value, maxCharCount)
            textElement.value = text; // write back the sliced text
            S('#text_char_counter').innerText = `${text.length}/${maxCharCount}`; // update the char counter
            break;
        case 'tab-url':
            text = getUrlText(S('#qr-url').value);
            break;
        case 'tab-vcard':
            const firstname = S('#vcard_first_name').value;
            const surename = S('#vcard_surename').value;
            const orga = S('#vcard_organization').value;
            const title = S('#vcard_title').value;
            const phoneCell = S('#vcard_tel_cell').value;
            const phoneWork = S('#vcard_tel_work').value;
            const phoneHome = S('#vcard_tel_home').value;
            const emailHome = S('#vcard_email_home').value;
            const emailWork = S('#vcard_email_work').value;
            const address = S('#vcard_address').value;
            const website = S('#vcard_url').value;
            text = getVCardText(firstname, surename, orga, title, phoneCell, phoneWork, phoneHome, emailHome, emailWork, address, website);
            S('#vcard_preview').innerHTML = text.replace(/\n/g, '<br>');
            break;
        case 'tab-wifi':    
            const ssid = S('#wifi_ssid').value;
            const password = S('#wifi_password').value;
            const encryption = S('#wifi_encryption').value;
            const hidden = S('#wifi_hidden').checked;
            text = getWifiText(ssid, password, encryption, hidden);
            S('#wifi_preview').innerHTML = text;
            break;
        case 'tab-email':
            const recipient = S('#email_recipient').value;
            const subject = S('#email_subject').value;
            const body = S('#email_body').value;
            text = getMailText(recipient, subject, body);
            S('#email_preview').innerHTML = text;
            break;
        case 'tab-sms':
            const phone = S('#sms_phone').value;
            const maxSmsCharCount = 160
            const messageElement = S('#sms_message');
            const message = messageElement.value.slice(0, maxSmsCharCount);
            text = getSMSText(phone, message);
            messageElement.value = message;
            S('#sms_char_counter').innerText = `${message.length}/${maxSmsCharCount}`;
            S('#sms_preview').innerHTML = text;
        default:
            text = '';
            break;
    }
    return text;
}

function updateLivePreview() {
    // get main qr code data dependent on the user input
    const activeTab = document.querySelector('.is-active').dataset.tab;
    const text = getTextByTab(activeTab);

    // general/shape settings
    const colorLight = S('#qr-color-light').value;
    const colorDark = S('#qr-color-dark').value;
    const frameSize = parseInt(S('#qr-frame').value);
    const errorLevel = getErrorLevel(S('#qr-error-level').value);
    const maskId = parseInt(S('#qr-mask').value);
    
    // get active shape settings
    const bodyBase64 = document.querySelector('.radios-body-type input[type="radio"]:checked')?.nextElementSibling.dataset.icon || '';
    const edgeBase64 = document.querySelector('.radios-edges input[type="radio"]:checked')?.nextElementSibling.dataset.icon || '';

    // Generate QR Code
    const segs = qrcodegen.QrSegment.makeSegments(text);
    const qr = qrcodegen.QrCode.encodeSegments(segs, errorLevel, 1, 40, maskId, true);
    const svg = toSvgString(qr, frameSize, colorLight, colorDark, bodyBase64, edgeBase64);
    
    // write the svg to the preview
    S('#qr-preview').innerHTML = svg;

    // Insert image into QR Code
    const file = S('#qr-icon').files[0];
    if (file) {
        const fullscreen = S('#qr-icon-fullscreen').checked;
        const opacity = S('#qr-icon-opacity').value;
        insertImageIntoQRCode(file, frameSize, qr.size, fullscreen, opacity);
    }

    // Insert label into QR Code
    const label = S('#qr-label-text').value;
    const bgColorElement = S('#qr-label-background-color');
    const paddingTbElement = S('#qr-label-padding-tb');
    const paddingLrElement = S('#qr-label-padding-lr');
    const useBackground = S('#qr-label-use-background').checked;
    
    bgColorElement.disabled = !useBackground;
    paddingTbElement.disabled = !useBackground;
    paddingLrElement.disabled = !useBackground;

    if (label) {
        const fontSize = parseInt(S('#qr-label-font-size').value);
        const fontFamily = S('#qr-label-font-family').value;
        const fontType = S('#qr-label-font-type').value;
        const fontColor = S('#qr-label-font-color').value;
        const bgColor = useBackground ? bgColorElement.value : '';
        const paddingTb = useBackground ? parseInt(paddingTbElement.value) : 0;
        const paddingLr = useBackground ? parseInt(paddingLrElement.value) : 0;
        
        insertLabelIntoQRCode(label, fontSize, fontFamily, fontType, fontColor, bgColor, paddingTb, paddingLr);
    }
}

function getErrorLevel(value) {
    const QRC = qrcodegen.QrCode;
    return {
        'L': QRC.Ecc.LOW,
        'M': QRC.Ecc.MEDIUM,
        'Q': QRC.Ecc.QUARTILE,
        'H': QRC.Ecc.HIGH
    }[value] || QRC.Ecc.LOW;
}

function insertLabelIntoQRCode(label, fontSize, fontFamily, fontType, fontColor, backgroundColor='', paddingTb=0, paddingLr=0, factor=0.2) {   
    const qrSvg = S('#qr-code-preview');
    let txtElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    txtElement.textContent = label;
    txtElement.setAttribute('font-size', fontSize * factor);
    txtElement.setAttribute('font-family', fontFamily);
    txtElement.setAttribute('font-weight', fontType === 'bold' ? 'bold' : 'normal');
    txtElement.setAttribute('font-style', fontType === 'italic' ? 'italic' : 'normal');
    txtElement.setAttribute('fill', fontColor);
    txtElement.setAttribute('x', '50%');
    txtElement.setAttribute('y', '50%');
    txtElement.setAttribute('text-anchor', 'middle');
    txtElement.setAttribute('dominant-baseline', 'middle');
    
    if (backgroundColor) {
        // Append text element to SVG to measure its size
        let bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        qrSvg.appendChild(txtElement);
        const bbox = txtElement.getBBox();
        qrSvg.removeChild(txtElement);

        // Create background rectangle
        bgRect.setAttribute('x', bbox.x - paddingLr * factor);
        bgRect.setAttribute('y', bbox.y - paddingTb * factor);
        bgRect.setAttribute('width', bbox.width + 2 * paddingLr * factor);
        bgRect.setAttribute('height', bbox.height + 2 * paddingTb * factor);
        bgRect.setAttribute('fill', backgroundColor);
        bgRect.setAttribute('id', 'bg-label');
        qrSvg.appendChild(bgRect);
    }
    qrSvg.appendChild(txtElement);
}

function insertImageIntoQRCode(file, border, qrSize, fullscreen, opacity) {
    const reader = new FileReader();
    reader.onload = function(e) {
        _setImage(e.target.result, border, qrSize, fullscreen, opacity);
    };
    reader.readAsDataURL(file);
}

function _setImage(imgSrc, border, qrSize, fullscreen, opacity) {
    const qrSvg = S('#qr-code-preview');
    const maxSize = fullscreen ? qrSize : qrSize / 3.0;
    const offset = (qrSize - maxSize) / 2.0;
    
    let imgElement = document.createElementNS('http://www.w3.org/2000/svg', 'image');

    imgElement.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imgSrc);
    imgElement.setAttribute('x', `${border + offset}`);
    imgElement.setAttribute('y', `${border + offset}`);
    imgElement.setAttribute('width', `${maxSize}`);
    imgElement.setAttribute('height', `${maxSize}`);
    imgElement.setAttribute('opacity', opacity);
    // Ensure the image covers the entire area while maintaining its aspect ratio
    imgElement.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    qrSvg.appendChild(imgElement);
}
