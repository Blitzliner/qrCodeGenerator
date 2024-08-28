'use strict';

import {getFilter} from './color.js';


export function svgToBase64(svg) {
    if (!svg) {
        return '';
    }
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function S(selctor, all = false) {
    if (all) {
        return document.querySelectorAll(selctor);
    } else {
        return document.querySelector(selctor);
    }
}

function _getDef(bodyTypeIcon, edgeIcon, color) {
    const filter = getFilter(color);
    
    if (bodyTypeIcon || edgeIcon) {
        let defs = '\t<defs>\n';
        if (bodyTypeIcon) {
            defs += `\t\t<g id="b"><image width="1.01" height="1.01" href="${bodyTypeIcon}" style="${filter}"/></g>\n`;
        }
        if (edgeIcon) {
            defs += `\t\t<g id="e"><image width="7" height="7" href="${edgeIcon}" style="${filter}"/></g>\n`;
        }
        defs += '\t</defs>\n';
        return defs
    } else {
        return '';
    }
}

/**
 * Returns a string of SVG code for an image depicting the specified QR Code, with the specified
 * number of border modules. The string always uses Unix newlines (\n), regardless of the platform.
 * @param {Object} qr - The QR Code to render (not null)
 * @param {number} border - The number of border modules to add, which must be non-negative
 * @param {string} lightColor - The color to use for light modules, in any format supported by CSS, not null
 * @param {string} darkColor - The color to use for dark modules, in any format supported by CSS, not null
 * @returns {string} A string representing the QR Code as an SVG XML document
 * @throws {Error} If any object is null or if the border is negative
 */
export function toSvgString(qr, border, lightColor, darkColor, bodyTypeIcon='', edgeIcon='') {
    if (!qr || !lightColor || !darkColor) {
        throw new Error("Null argument");
    }
    if (border < 0) {
        throw new Error("Border must be non-negative");
    }
    const brd = border;
    const defs = _getDef(bodyTypeIcon, edgeIcon, darkColor);
    const sb = [];
    
    sb.push('<?xml version="1.0" encoding="UTF-8"?>\n');
    sb.push('<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n');
    sb.push(`<svg id="qr-code-preview" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 ${qr.size + brd * 2} ${qr.size + brd * 2}" stroke="none">\n`);
    sb.push(`\t<rect width="100%" height="100%" fill="${lightColor}"/>\n`);
    
    if (defs) {
        sb.push(defs);
    }
    
    let function_pattern = edgeIcon ? '' : '\t<path d="'
    // let data_pixel = bodyTypeIcon ? '' : '\t<path d="'
    sb.push(bodyTypeIcon ? '' : '\t<path d="');

    for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
            if (qr.getModule(x, y)) {
                if (qr.getFinderPattern(x, y)) {
                    if (!edgeIcon) {
                        function_pattern += `M${x + brd},${y + brd}h1v1h-1z `;
                    } // else: draw function pattern based on the icons
                } else {
                    if (bodyTypeIcon) {
                        //data_pixel += `\t<use xlink:href="#b" x="${x + brd}" y="${y + brd}"/>\n`;
                        sb.push(`\t<use xlink:href="#b" x="${x + brd}" y="${y + brd}"/>\n`);
                    } else {
                        //data_pixel += `M${x + brd},${y + brd}h1v1h-1z `
                        sb.push(`M${x + brd},${y + brd}h1v1h-1z `);
                    }
                }
            }
        }
    }
    if (!bodyTypeIcon) {
        //data_pixel += `" fill="${darkColor}"/>\n`;
        sb.push(`" fill="${darkColor}"/>\n`);
    }
    if (!edgeIcon) {
        function_pattern += `" fill="${darkColor}"/>\n`;
    } else {
        function_pattern += `<use xlink:href="#e" x="${brd}" y="${brd}"/>\n`;
        function_pattern += `<use xlink:href="#e" x="${qr.size - 7 + brd}" y="${brd}" transform="rotate(90, ${qr.size - 7 + brd + 3.5}, ${brd + 3.5})"/>\n`;
        function_pattern += `<use xlink:href="#e" x="${brd}" y="${qr.size - 7 + brd}" transform="rotate(-90, ${brd + 3.5}, ${qr.size - 7 + brd + 3.5})"/>\n`;
    }

    //sb.push(data_pixel);
    sb.push(function_pattern);
    sb.push('</svg>\n');
    
    return sb.join('');
}