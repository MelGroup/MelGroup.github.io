(function(){
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
})();