(function(){
    AOS.init({
        duration: 600,
        once: true,
        offset: 50,
        easing: 'ease-out-quad',
    });

    const memberTarget = 1400;
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

    window.openJoinModal = function() {
        document.getElementById('joinModal').style.display = 'flex';
    };
    
    window.closeModal = function() {
        document.getElementById('joinModal').style.display = 'none';
    };
})();