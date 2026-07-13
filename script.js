(function(){
    const translations = {
        zh: {
            founded: '成立于2025年2月2日',
            hero_line2: '《MELON SANDBOX》游戏群组',
            hero_desc: '甜瓜群组是GW建立的《Melon Sandbox》游戏交流群组，专注于内容讨论、资源共享与技术交流等!',
            join_group_btn: '加入群组',
            visit_owner_homepage: '访问群主主页',
            services_label: '[ Melon group ]',
            melorce_name: 'Melorce',
            services_title: '服务',
            melorce_desc: '《Melon Sandbox》资源平台',
            tag1: '游戏资源',
            tag2: '内容宣传',
            tag3: '游戏教程',
            tag4: '芯片生成',
            tag6: '甜瓜下载',
            visit_melorce: '前往Melorce',
            ai_name: 'Jelbe',
            ai_desc: '《Melon Sandbox》AI',
            ai_tag: 'AI',
            visit_ai: '询问AI',
            source_name: '源码服务',
            source_desc: '甜瓜群组源码服务',
            source_tag: '源码',
            visit_source: '访问仓库',
            card_name: '成员证生成站',
            card_desc: '甜瓜群组/XS工作室成员证生成平台',
            card_tag: '成员证',
            visit_card: '生成成员证',
            member_count_label: '[ 群组成员 ]',
            days_since_label: '[ 成立天数 ]',
            footer_partner_prefix: '合作伙伴：',
            contact_email_label: '联系邮箱：',
            join_group_title: '加入群组',
            join_qq_group: '加入QQ群',
            join_qq_channel: '加入QQ频道',
            cancel: '取消',
            ai_modal_title: 'Jelbe',
            ai_qa: '教程问答',
            ai_dsl: '生成DSL'
        },
        ja: {
            founded: '2025年2月2日設立',
            hero_line2: '『MELON SANDBOX』ゲームグループ',
            hero_desc: '甜瓜群组はGWが設立した『Melon Sandbox』ゲーム交流グループで、内容討論、リソース共有、技術交流などを中心に活動しています!',
            join_group_btn: 'グループ参加',
            visit_owner_homepage: 'グループオーナーのプロフィールへ行く',
            services_label: '[ Melon group ]',
            melorce_name: 'メロルセ',
            services_title: 'サービス',
            melorce_desc: '『Melon Sandbox』リソースプラットフォーム',
            tag1: 'ゲームリソース',
            tag2: 'コンテンツ宣伝',
            tag3: 'ゲームチュートリアル',
            tag4: 'チップ生成',
            tag6: 'メロンダウンロード',
            visit_melorce: 'メロルセへ',
            ai_name: 'ジェルベ',
            ai_desc: '『Melon Sandbox』AI',
            ai_tag: 'AI',
            visit_ai: 'AIに質問',
            source_name: 'ソースコードサービス',
            source_desc: '甜瓜群组ソースコードサービス',
            source_tag: 'ソースコード',
            visit_source: 'リポジトリへ',
            card_name: 'メンバー証生成ステーション',
            card_desc: '甜瓜群组/XS工作室メンバー証生成プラットフォーム',
            card_tag: 'メンバー証',
            visit_card: 'メンバー証作成',
            member_count_label: '[ グループメンバー ]',
            days_since_label: '[ 設立日数 ]',
            footer_partner_prefix: 'パートナー：',
            contact_email_label: '連絡先：',
            join_group_title: 'グループ参加',
            join_qq_group: 'QQグループ',
            join_qq_channel: 'QQチャンネル',
            cancel: 'キャンセル',
            ai_modal_title: 'ジェルベ',
            ai_qa: 'チュートリアルQ&A',
            ai_dsl: 'DSL生成'
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

    const memberTarget = 1200;
    const counterEl = document.getElementById('member-counter');
    const daysCounterEl = document.getElementById('days-counter');
    const statsCard = document.getElementById('stats-card');
    
    function getDaysSinceStart() {
        const startDate = new Date(2025, 1, 2);
        const today = new Date();
        startDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffTime = today - startDate;
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    
    const daysTarget = getDaysSinceStart();
    
    let memberAnimationTriggered = false;
    let daysAnimationTriggered = false;
    
    function animateMemberCount(start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            counterEl.innerHTML = Math.floor(easeProgress * (end - start) + start).toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                counterEl.innerHTML = end.toLocaleString() + '+';
            }
        };
        window.requestAnimationFrame(step);
    }
    
    function animateDaysCount(start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            daysCounterEl.innerHTML = Math.floor(easeProgress * (end - start) + start).toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                daysCounterEl.innerHTML = end.toLocaleString();
            }
        };
        window.requestAnimationFrame(step);
    }

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!memberAnimationTriggered) {
                    memberAnimationTriggered = true;
                    animateMemberCount(0, memberTarget, 2000);
                }
                if (!daysAnimationTriggered) {
                    daysAnimationTriggered = true;
                    animateDaysCount(0, daysTarget, 2000);
                }
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    if (statsCard) {
        statsObserver.observe(statsCard);
    }

    updateUIText('zh');
    
    window.openJoinModal = function() {
        document.getElementById('joinModal').style.display = 'flex';
    };
    
    window.closeModal = function() {
        document.getElementById('joinModal').style.display = 'none';
    };

    window.openAiModal = function() {
        document.getElementById('aiModal').style.display = 'flex';
    };

    window.closeAiModal = function() {
        document.getElementById('aiModal').style.display = 'none';
    };
})();