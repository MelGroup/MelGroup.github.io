(function(){
    const translations = {
        zh: {
            founded: 'MoFiger2026.7.1',
            hero_line2: 'MoFiger',
            hero_desc: 'MoFiger——一款集合了Melorce资源列表、MSUT文件库及DSL工具的APP!',
            download_btn: '下载MoFiger',
            footer_partner_prefix: '合作伙伴：',
            contact_email_label: '联系邮箱：'
        },
        ja: {
            founded: 'マカロン2026.7.1',
            hero_line2: 'マカロン',
            hero_desc: 'マカロン——メロルセリソースリスト、MSUTファイルライブラリ、DSLツールを統合したAPP!',
            download_btn: 'マカロンをダウンロード',
            footer_partner_prefix: 'パートナー：',
            contact_email_label: '連絡先：'
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

    updateUIText('zh');
})();