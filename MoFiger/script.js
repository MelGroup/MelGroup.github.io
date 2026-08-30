(function(){
    const translations = {
        zh: {
            founded: 'MoFiger2026.8.30',
            hero_line2: 'MoFiger',
            hero_desc: 'MoFiger——一款集合了Melorce资源列表、MSUT文件库及DSL工具、图芯工具等的APP!',
            download_btn: '下载MoFiger',
            download_modal_title: '下载MoFiger',
            direct_download: 'MSUT',
            pan123: '123云盘',
            footer_partner_prefix: '合作伙伴：',
            contact_email_label: '联系邮箱：',
            cancel: '取消'
        },
        ja: {
            founded: 'マカロン2026.8.30',
            hero_line2: 'マカロン',
            hero_desc: 'マカロン——メロルセリソースリスト、MSUTファイルライブラリ、DSLツール、図芯ツールを統合したAPP!',
            download_btn: 'マカロンをダウンロード',
            download_modal_title: 'マカロンをダウンロード',
            direct_download: 'MSUT',
            pan123: '123クラウド',
            footer_partner_prefix: 'パートナー：',
            contact_email_label: '連絡先：',
            cancel: 'キャンセル'
        }
    };

    let currentLang = 'zh';
    const langBtn = document.getElementById('langToggle');
    
    function updateUIText(lang) {
        document.documentElement.lang = lang === 'zh' ? 'zh' : 'ja';
        document.querySelectorAll('.i18n').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key && translations[lang] && translations[lang][key]) {
                el.textContent = translations[lang][key];
            }
        });
        langBtn.textContent = lang === 'zh' ? '[ 日本語 ]' : '[ 简体中文 ]';
    }

    langBtn.addEventListener('click', () => {
        currentLang = currentLang === 'zh' ? 'ja' : 'zh';
        updateUIText(currentLang);
    });

    AOS.init({
        duration: 600,
        once: true,
        offset: 50,
        easing: 'ease-out-quad',
    });

    window.openDownloadModal = function() {
        document.getElementById('downloadModal').style.display = 'flex';
    };

    window.closeDownloadModal = function() {
        document.getElementById('downloadModal').style.display = 'none';
    };

    updateUIText('zh');
})();