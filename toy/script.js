(function(){
    const translations = {
        zh: {
            services_label: '[ Melon group ]',
            services_title: 'Toy',
            game1_name: '逃离甜瓜',
            game1_btn: '游玩逃离甜瓜',
            game3_name: '图芯工具',
            game3_btn: '使用工具',
            game2_name: '贪吃蛇',
            game2_btn: '游玩贪吃蛇',
            game4_name: '成员证生成站',
            game4_btn: '生成成员证',
            footer_partner_prefix: '合作伙伴：',
            contact_email_label: '联系邮箱：'
        },
        ja: {
            services_label: '[ Melon group ]',
            services_title: 'Toy',
            game1_name: 'スイカからの脱出',
            game1_btn: 'スイカからの脱出をプレイ',
            game3_name: '図芯ツール',
            game3_btn: 'ツールを使用',
            game2_name: 'ヘビゲーム',
            game2_btn: 'ヘビゲームをプレイ',
            game4_name: 'メンバーカード生成所',
            game4_btn: 'メンバーカードを生成',
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