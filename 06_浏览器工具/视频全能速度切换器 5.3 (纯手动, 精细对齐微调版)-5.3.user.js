// ==UserScript==
// @name         视频全能速度切换器 5.3 (纯手动, 精细对齐微调版)
// @namespace    http://tampermonkey.net/
// @version      5.3
// @description  自定义按钮切换速度，YT & B站适配，缩小 10% 尺寸并微调 B 站对齐
// @author       Gemini
// @match        *://www.youtube.com/*
// @match        *://www.bilibili.com/video/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const SPEEDS = [1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 5.0];
    const DEFAULT_SPEED = 1.25;
    const CONTAINER_ID = 'custom-universal-speed-container';

    let lastUrl = '';

    const formatSpeedLabel = (s) => {
        return s.toFixed(s % 1 === 0 ? 1 : (s * 10 % 1 === 0 ? 1 : 2)) + 'x';
    };

    const injectButtons = () => {
        if (document.getElementById(CONTAINER_ID)) return;

        let targetParent = document.querySelector('.ytp-right-controls'); // YT
        let isBili = false;

        if (!targetParent) {
            targetParent = document.querySelector('.bpx-player-control-bottom-right');
            isBili = true;
        }

        if (!targetParent) return;

        const container = document.createElement('div');
        container.id = CONTAINER_ID;

        container.style.cssText = `
            display: inline-flex;
            align-items: center;
            height: 100%;
            padding: 0 4px;
            vertical-align: middle;
            ${isBili ? 'margin-right: 8px; position: relative; top: -7px;' : ''}
        `;

        SPEEDS.forEach(speed => {
            const btn = document.createElement('button');
            btn.innerText = formatSpeedLabel(speed);
            btn.className = 'custom-speed-btn';

            // 尺寸缩小了约 10% (高度 30->27, 字体 14->13, Padding 10->8)
            btn.style.cssText = `
                width: auto;
                padding: 0 8px;
                margin: 0 2px;
                font-size: 13px;
                font-weight: bold;
                color: #eee;
                background: rgba(255, 255, 255, 0.15);
                border-radius: 5px;
                height: 27px;
                line-height: 27px;
                border: none;
                cursor: pointer;
                transition: all 0.25s ease;
                outline: none;
                display: flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
            `;

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                setSpeed(speed);
            };
            btn.dataset.speed = speed;
            container.appendChild(btn);
        });

        targetParent.insertBefore(container, targetParent.firstChild);
    };

    const setSpeed = (speed) => {
        const video = document.querySelector('video');
        if (!video) return;
        video.playbackRate = speed;
        const player = document.getElementById('movie_player');
        if (player && typeof player.setPlaybackRate === 'function' && speed <= 2) {
            player.setPlaybackRate(speed);
        }
        updateButtonState();
    };

    const updateButtonState = () => {
        const video = document.querySelector('video');
        if (!video) return;
        const currentSpeed = video.playbackRate;
        const btns = document.querySelectorAll('.custom-speed-btn');

        btns.forEach(btn => {
            const btnSpeed = parseFloat(btn.dataset.speed);
            if (Math.abs(btnSpeed - currentSpeed) < 0.01) {
                if (btnSpeed > 2.0) {
                    btn.style.backgroundColor = '#ff69b4';
                    btn.style.color = '#fff';
                    btn.style.boxShadow = '0 0 12px rgba(255, 105, 180, 0.8)';
                } else {
                    btn.style.backgroundColor = '#fff';
                    btn.style.color = '#000';
                    btn.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.6)';
                }
            } else {
                btn.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                btn.style.color = '#eee';
                btn.style.boxShadow = 'none';
            }
        });
    };

    const run = () => {
        injectButtons();
        if (window.location.href !== lastUrl) {
            const video = document.querySelector('video');
            if (video) {
                setTimeout(() => setSpeed(DEFAULT_SPEED), 1000);
                lastUrl = window.location.href;
            }
        }
        updateButtonState();
    };

    setInterval(run, 1000);
})();