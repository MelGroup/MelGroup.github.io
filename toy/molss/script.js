(function () {
    'use strict';

    var INIT_CASH = 800;
    var FEE_RATE = 0.002;
    var WINDOW_MS = 2 * 60 * 1000;
    var MAX_LOGS = 20;
    var TICK_MS = 1000;

    var state = {
        price: 40 + Math.random() * (50 - 40),
        cash: INIT_CASH,
        high: 0,
        low: Infinity,
        history: [],
        positions: [],
        logs: [],
        events: [],
        burst: 0
    };
    state.price = Math.round(state.price * 100) / 100;

    var els = {
        cashDisplay: document.getElementById('cashDisplay'),
        rateDisplay: document.getElementById('rateDisplay'),
        highDisplay: document.getElementById('highDisplay'),
        lowDisplay: document.getElementById('lowDisplay'),
        openInterestDisplay: document.getElementById('openInterestDisplay'),
        chart: document.getElementById('chart'),
        logList: document.getElementById('logList'),
        posBody: document.getElementById('posBody'),
        amount: document.getElementById('amount'),
        tabLong: document.getElementById('tabLong'),
        tabShort: document.getElementById('tabShort'),
        pvQty: document.getElementById('pvQty'),
        pvValue: document.getElementById('pvValue'),
        pvFee: document.getElementById('pvFee'),
        pvLiq: document.getElementById('pvLiq'),
        submitBtn: document.getElementById('submitBtn'),
        addModal: document.getElementById('addModal'),
        modalClose: document.getElementById('modalClose'),
        addAmount: document.getElementById('addAmount'),
        addConfirm: document.getElementById('addConfirm'),
        modalPosInfo: document.getElementById('modalPosInfo'),
        mAddQty: document.getElementById('mAddQty'),
        mAddCost: document.getElementById('mAddCost'),
        toast: document.getElementById('toast')
    };

    var ctx = els.chart.getContext('2d');
    var orderSide = 'long';
    var orderLev = 1;
    var addTarget = null;

    function fmt(n, d) {
        return Number(n).toFixed(d);
    }

    function fmtTime(t) {
        var d = new Date(t);
        var h = d.getHours();
        var m = d.getMinutes();
        var s = d.getSeconds();
        return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    }

    function dataWidth(containerW) {
        var points = state.history.length;
        if (points < 2) return containerW;
        var minVisibleW = Math.max(containerW, containerW * 1.5);
        var w = points * 14;
        if (w < minVisibleW) w = minVisibleW;
        return w;
    }

    var toastTimer = null;
    function showToast(msg, type) {
        els.toast.textContent = msg;
        els.toast.classList.remove('toast-error');
        if (type === 'error') els.toast.classList.add('toast-error');
        els.toast.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            els.toast.classList.remove('show');
        }, 2200);
    }

    function pushLog(type, label, detail) {
        state.logs.unshift({ type: type, label: label, detail: detail, t: Date.now() });
        if (state.logs.length > MAX_LOGS) state.logs.length = MAX_LOGS;
        renderLogs();
    }

    function totalPosQty() {
        var q = 0;
        for (var i = 0; i < state.positions.length; i++) q += state.positions[i].qty;
        return q;
    }

    function updateMarket() {
        els.cashDisplay.textContent = fmt(state.cash, 2) + ' Mels';
        els.rateDisplay.textContent = fmt(state.price, 2) + ' Mels = 1 Molss';
        els.highDisplay.textContent = fmt(state.high, 2);
        els.lowDisplay.textContent = fmt(state.low, 2);
        els.openInterestDisplay.textContent = fmt(totalPosQty(), 2);
    }

    function liqPrice(p) {
        if (p.side === 'long') return p.entry * (1 - 1 / p.lev);
        return p.entry * (1 + 1 / p.lev);
    }

    function pnlOf(p) {
        if (p.side === 'long') return (state.price - p.entry) * p.qty;
        return (p.entry - state.price) * p.qty;
    }

    function renderPosition() {
        if (!state.positions.length) {
            els.posBody.innerHTML = '<div class="pos-empty">暂无持仓</div>';
            return;
        }
        var html = '<div class="pos-table">' +
            '<div class="pos-head-row">' +
            '<span class="pos-head-cell">方向</span>' +
            '<span class="pos-head-cell">数量</span>' +
            '<span class="pos-head-cell">开仓价</span>' +
            '<span class="pos-head-cell">杠杆</span>' +
            '<span class="pos-head-cell">保证金</span>' +
            '<span class="pos-head-cell">强平价</span>' +
            '<span class="pos-head-cell">盈亏</span>' +
            '<span class="pos-head-cell">操作</span>' +
            '</div>';
        for (var i = 0; i < state.positions.length; i++) {
            var p = state.positions[i];
            var pnl = pnlOf(p);
            var pnlCls = pnl >= 0 ? 'pnl-up' : 'pnl-down';
            var sideCls = p.side === 'long' ? 'side-long' : 'side-short';
            var sideTxt = p.side === 'long' ? '开多' : '开空';
            html += '<div class="pos-row">' +
                '<span class="pos-cell pos-side ' + sideCls + '">' + sideTxt + '</span>' +
                '<span class="pos-cell">' + fmt(p.qty, 2) + '</span>' +
                '<span class="pos-cell">' + fmt(p.entry, 2) + '</span>' +
                '<span class="pos-cell">' + p.lev + 'x</span>' +
                '<span class="pos-cell">' + fmt(p.margin, 2) + '</span>' +
                '<span class="pos-cell">' + fmt(liqPrice(p), 2) + '</span>' +
                '<span class="pos-cell ' + pnlCls + '">' + (pnl >= 0 ? '+' : '') + fmt(pnl, 2) + '</span>' +
                '<span class="pos-cell">' +
                '<button type="button" class="act-add" data-act="add" data-idx="' + i + '"><i class="fa-solid fa-plus"></i></button>' +
                '<button type="button" class="act-close" data-act="close" data-idx="' + i + '"><i class="fa-solid fa-circle-xmark"></i></button>' +
                '</span></div>';
        }
        html += '</div>';
        els.posBody.innerHTML = html;
        els.posBody.querySelectorAll('.pos-row .act-add').forEach(function (btn) {
            var idx = Number(btn.getAttribute('data-idx'));
            btn.addEventListener('click', function () { openAddModal(idx); });
        });
        els.posBody.querySelectorAll('.pos-row .act-close').forEach(function (btn) {
            var idx = Number(btn.getAttribute('data-idx'));
            btn.addEventListener('click', function () { closePosition(idx); });
        });
    }

    function calcPreview() {
        var qty = Number(els.amount.value) || 0;
        var value = qty * state.price;
        var margin = value / orderLev;
        var fee = value * FEE_RATE;
        els.pvQty.textContent = fmt(margin, 2) + ' Mels';
        els.pvValue.textContent = fmt(value, 2) + ' Mels';
        els.pvFee.textContent = fmt(fee, 2) + ' Mels';
        els.pvLiq.textContent = (orderSide === 'long'
            ? fmt(state.price * (1 - 1 / orderLev), 2)
            : fmt(state.price * (1 + 1 / orderLev), 2)) + ' Mels';
    }

    function openPosition() {
        var qty = Number(els.amount.value) || 0;
        if (qty <= 0) {
            showToast('数量无效');
            return;
        }
        var value = qty * state.price;
        var margin = value / orderLev;
        var fee = value * FEE_RATE;
        if (state.positions.length >= 5) {
            showToast('最多持有5个仓位');
            return;
        }
        if (margin + fee > state.cash) {
            showToast('余额不足');
            return;
        }
        state.cash -= margin + fee;
        state.positions.push({
            side: orderSide,
            lev: orderLev,
            qty: qty,
            margin: margin,
            entry: state.price
        });
        pushLog(orderSide, orderSide === 'long' ? '开多' : '开空', fmt(qty, 2) + ' @ ' + fmt(state.price, 2));
        state.events.push({ t: Date.now(), price: state.price, kind: 'open', side: orderSide, margin: margin, lev: orderLev });
        showToast((orderSide === 'long' ? '开多' : '开空') + '成功');
        updateMarket();
        renderPosition();
        calcPreview();
    }

    function openAddModal(idx) {
        var p = state.positions[idx];
        if (!p) return;
        addTarget = idx;
        els.modalPosInfo.innerHTML = '<span>仓位: <b>' + (p.side === 'long' ? '开多' : '开空') + ' ' + p.lev + 'x</b></span>' +
            '<span>当前数量: <b>' + fmt(p.qty, 2) + '</b></span>' +
            '<span>当前保证金: <b>' + fmt(p.margin, 2) + ' Mels</b></span>';
        els.addAmount.value = '2';
        els.addModal.classList.add('show');
        updateAddPreview();
    }

    function updateAddPreview() {
        var addQty = Number(els.addAmount.value) || 0;
        var p = state.positions[addTarget];
        if (!p) return;
        var addValue = addQty * state.price;
        var addMargin = addValue / p.lev;
        var fee = addValue * FEE_RATE;
        els.mAddQty.textContent = fmt(addQty, 2) + ' Molss';
        els.mAddCost.textContent = fmt(addMargin + fee, 2) + ' Mels';
    }

    function closeAddModal() {
        els.addModal.classList.remove('show');
        addTarget = null;
    }

    function confirmAdd() {
        if (addTarget === null) return;
        var p = state.positions[addTarget];
        if (!p) {
            closeAddModal();
            return;
        }
        var addQty = Number(els.addAmount.value) || 0;
        if (addQty <= 0) {
            showToast('加仓数量无效');
            return;
        }
        var addValue = addQty * state.price;
        var addMargin = addValue / p.lev;
        var fee = addValue * FEE_RATE;
        if (addMargin + fee > state.cash) {
            showToast('余额不足');
            return;
        }
        var totalQty = p.qty + addQty;
        var weightedEntry = (p.entry * p.qty + state.price * addQty) / totalQty;
        state.cash -= addMargin + fee;
        p.qty = totalQty;
        p.margin += addMargin;
        p.entry = weightedEntry;
        pushLog('close', '加仓', fmt(addQty, 2) + ' @ ' + fmt(state.price, 2));
        state.events.push({ t: Date.now(), price: state.price, kind: 'add', side: p.side, spend: addMargin + fee });
        showToast('加仓成功');
        closeAddModal();
        updateMarket();
        renderPosition();
        calcPreview();
    }

    function closePosition(idx) {
        var p = state.positions[idx];
        if (!p) return;
        var pnl = pnlOf(p);
        var fee = state.price * p.qty * FEE_RATE;
        state.cash += p.margin + pnl - fee;
        pushLog('close', '平仓', (pnl >= 0 ? '+' : '') + fmt(pnl - fee, 2) + ' Mels');
        state.events.push({ t: Date.now(), price: state.price, kind: 'pnl', pnl: pnl - fee });
        state.positions.splice(idx, 1);
        showToast('平仓成功');
        updateMarket();
        renderPosition();
        calcPreview();
    }

    function liquidate(idx) {
        var p = state.positions[idx];
        if (!p) return;
        pushLog('liq', '爆仓', '-' + fmt(p.margin, 2) + ' Mels');
        state.events.push({ t: Date.now(), price: state.price, kind: 'liq', loss: p.margin });
        state.positions.splice(idx, 1);
        showToast('爆仓', 'error');
        updateMarket();
        renderPosition();
        calcPreview();
    }

    function renderLogs() {
        if (!state.logs.length) {
            els.logList.innerHTML = '<div class="pos-empty">暂无交易记录</div>';
            return;
        }
        var html = '';
        for (var i = 0; i < state.logs.length; i++) {
            var lg = state.logs[i];
            var detailCls = '';
            if (lg.detail.indexOf('+') === 0) detailCls = ' pnl-up';
            else if (lg.detail.indexOf('-') === 0) detailCls = ' pnl-down';
            html += '<div class="log-item">' +
                '<span class="log-time">' + fmtTime(lg.t) + '</span>' +
                '<span class="log-type ' + lg.type + '">' + lg.label + '</span>' +
                '<span class="log-detail' + detailCls + '">' + lg.detail + '</span></div>';
        }
        els.logList.innerHTML = html;
    }

    function tick() {
        var delta = (Math.random() - 0.5) * 3.6;
        if (state.burst > 0) {
            delta *= 4.5;
            state.burst--;
        } else if (Math.random() < 0.012) {
            state.burst = 3 + Math.floor(Math.random() * 2);
            delta *= 4.5;
            state.burst--;
        }
        if (Math.random() < 0.02) {
            var dir = Math.random() < 0.5 ? -1 : 1;
            delta += dir * (state.price * (0.05 + Math.random() * 0.09));
        }
        state.price = Math.max(1, Math.round((state.price + delta) * 100) / 100);
        if (state.price > state.high) state.high = state.price;
        if (state.price < state.low) state.low = state.price;
        state.history.push({ t: Date.now(), v: state.price });
        var cutoff = Date.now() - WINDOW_MS;
        while (state.history.length && state.history[0].t < cutoff) state.history.shift();

        if (state.positions.length) {
            for (var i = state.positions.length - 1; i >= 0; i--) {
                var p = state.positions[i];
                var liq = liqPrice(p);
                if ((p.side === 'long' && state.price <= liq) || (p.side === 'short' && state.price >= liq)) {
                    liquidate(i);
                }
            }
        }

        updateMarket();
        renderPosition();
        calcPreview();
        if (addTarget !== null) updateAddPreview();
        drawChart();
    }

    function drawChart() {
        var scrollEl = els.chart.parentElement.parentElement;
        var wrapEl = els.chart.parentElement;
        var minW = scrollEl.clientWidth;
        var w = Math.max(minW, dataWidth(minW));
        var nearEnd = scrollEl.scrollLeft + scrollEl.clientWidth >= scrollEl.scrollWidth - 30;
        if (Math.abs(els.chart.clientWidth - w) > 1) {
            els.chart.style.width = w + 'px';
        }
        var h = wrapEl.clientHeight;
        if (!h) return;
        var dpr = window.devicePixelRatio || 1;
        els.chart.width = w * dpr;
        els.chart.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        var data = state.history;
        if (data.length < 2) return;

        if (nearEnd) scrollEl.scrollLeft = scrollEl.scrollWidth;

        var padL = 12;
        var padR = 52;
        var padT = 16;
        var padB = 20;
        var plotW = w - padL - padR;
        var plotH = h - padT - padB;
        var min = Math.min.apply(null, data.map(function (d) { return d.v; }));
        var max = Math.max.apply(null, data.map(function (d) { return d.v; }));
        var range = max - min || 1;
        var t0 = data[0].t;
        var t1 = data[data.length - 1].t;
        var span = (t1 - t0) || 1;

        ctx.strokeStyle = 'rgba(0,0,0,0.07)';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px ui-monospace, monospace';
        ctx.textAlign = 'left';
        for (var i = 0; i <= 4; i++) {
            var y = padT + (plotH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(padL + plotW, y);
            ctx.stroke();
            var val = max - (range / 4) * i;
            ctx.fillText(fmt(val, 2), padL + plotW + 6, y + 3);
        }

        function pt(i) {
            var d = data[i];
            var x = padL + ((d.t - t0) / span) * plotW;
            var y = padT + plotH - ((d.v - min) / range) * plotH;
            return [x, y];
        }

        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (var j = 0; j < data.length - 1; j++) {
            var a = pt(j);
            var b = pt(j + 1);
            ctx.strokeStyle = data[j + 1].v >= data[j].v ? '#f43f5e' : '#00a86b';
            ctx.beginPath();
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
            ctx.stroke();
        }

        var last = data[data.length - 1];
        var prevD = data[data.length - 2];
        var lp = pt(data.length - 1);
        var prevP = pt(data.length - 2);
        var ang = Math.atan2(lp[1] - prevP[1], lp[0] - prevP[0]);
        ctx.save();
        ctx.translate(lp[0], lp[1]);
        ctx.rotate(ang);
        ctx.fillStyle = last.v >= prevD.v ? '#f43f5e' : '#00a86b';
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-6, -6);
        ctx.lineTo(-6, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        drawMarkers();
    }

    function drawMarkers() {
        var data = state.history;
        if (!state.events.length) return;
        var t0 = data[0].t;
        var t1 = data[data.length - 1].t;
        var span = (t1 - t0) || 1;
        var min = Math.min.apply(null, data.map(function (d) { return d.v; }));
        var max = Math.max.apply(null, data.map(function (d) { return d.v; }));
        var range = max - min || 1;
        var padL = 12;
        var padR = 52;
        var padT = 16;
        var padB = 20;
        var plotW = els.chart.clientWidth - padL - padR;
        var plotH = els.chart.clientHeight - padT - padB;
        ctx.font = '700 10px ui-monospace, monospace';
        ctx.textAlign = 'center';
        for (var k = 0; k < state.events.length; k++) {
            var ev = state.events[k];
            if (ev.t < t0 || ev.t > t1) continue;
            var nearest = 0;
            var best = Infinity;
            for (var m = 0; m < data.length; m++) {
                var dist = Math.abs(data[m].t - ev.t);
                if (dist < best) { best = dist; nearest = m; }
            }
            var nd = data[nearest];
            var x = padL + ((nd.t - t0) / span) * plotW;
            var y = padT + plotH - ((nd.v - min) / range) * plotH;
            var dotColor = '#f97316';
            var textColor = '#f97316';
            var label = '爆仓';
            if (ev.kind === 'open') {
                dotColor = ev.side === 'long' ? '#f43f5e' : '#00a86b';
                textColor = dotColor;
                label = (ev.side === 'long' ? '开多' : '开空') + ' ' + fmt(ev.margin, 2) + ' ' + ev.lev + 'x';
            } else if (ev.kind === 'pnl') {
                dotColor = '#8b5cf6';
                textColor = ev.pnl >= 0 ? '#f43f5e' : '#00a86b';
                label = '平仓 ' + (ev.pnl >= 0 ? '+' : '') + fmt(ev.pnl, 2);
            } else if (ev.kind === 'add') {
                dotColor = '#8b5cf6';
                textColor = ev.side === 'long' ? '#f43f5e' : '#00a86b';
                label = '加仓 ' + fmt(ev.spend, 2);
            } else if (ev.kind === 'liq') {
                dotColor = '#f97316';
                textColor = '#f97316';
                label = '爆仓 -' + fmt(ev.loss, 2);
            }
            var above = y - 21 >= padT;
            var lineY1 = above ? y - 6 : y + 6;
            var lineY2 = above ? y - 18 : y + 18;
            var textY = above ? y - 21 : y + 21;
            ctx.strokeStyle = dotColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, lineY1);
            ctx.lineTo(x, lineY2);
            ctx.stroke();
            ctx.fillStyle = dotColor;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = textColor;
            ctx.fillText(label, x, textY);
        }
    }

    function bind() {
        els.tabLong.addEventListener('click', function () {
            orderSide = 'long';
            els.tabLong.classList.add('is-active');
            els.tabShort.classList.remove('is-active');
            els.submitBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>开多 Molss';
            els.submitBtn.classList.remove('is-short');
            calcPreview();
        });
        els.tabShort.addEventListener('click', function () {
            orderSide = 'short';
            els.tabShort.classList.add('is-active');
            els.tabLong.classList.remove('is-active');
            els.submitBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>开空 Molss';
            els.submitBtn.classList.add('is-short');
            calcPreview();
        });
        els.submitBtn.addEventListener('click', openPosition);
        els.amount.addEventListener('input', calcPreview);
        els.modalClose.addEventListener('click', closeAddModal);
        els.addModal.addEventListener('click', function (e) {
            if (e.target === els.addModal) closeAddModal();
        });
        els.addConfirm.addEventListener('click', confirmAdd);
        els.addAmount.addEventListener('input', updateAddPreview);
        document.querySelectorAll('.opt-btn[data-amt]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.opt-btn[data-amt]').forEach(function (b) { b.classList.remove('is-active'); });
                btn.classList.add('is-active');
                if (btn.getAttribute('data-amt') === 'max') {
                    var maxQty = Math.floor(state.cash / (state.price * (1 / orderLev + FEE_RATE)) * 100) / 100;
                    els.amount.value = Math.max(0, maxQty);
                } else {
                    els.amount.value = btn.getAttribute('data-amt');
                }
                calcPreview();
            });
        });
        document.querySelectorAll('.opt-btn[data-lev]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                orderLev = Number(btn.getAttribute('data-lev'));
                document.querySelectorAll('.opt-btn[data-lev]').forEach(function (b) { b.classList.remove('is-active'); });
                btn.classList.add('is-active');
                calcPreview();
            });
        });
    }

    state.high = state.price;
    state.low = state.price;
    state.history.push({ t: Date.now(), v: state.price });
    updateMarket();
    renderPosition();
    renderLogs();
    calcPreview();
    drawChart();
    bind();
    setInterval(tick, TICK_MS);
})();