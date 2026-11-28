(function () {
    'use strict';

    var INIT_CASH = 300;
    var FEE_RATE = 0.002;
    var WINDOW_MS = 5 * 60 * 1000;
    var MAX_LOGS = 20;
    var TICK_MS = 1000;
    var PRICE_BASE = 0.55;
    var VOL = 0.04;
    var KLINE_MS = 60000;
    var startTime = Date.now();

    var state = {
        price: 0.5 + Math.random() * 0.1,
        cash: INIT_CASH,
        high: 0,
        low: Infinity,
        history: [],
        positions: [],
        logs: [],
        events: [],
        burst: 0,
        kline: [],
        chartMode: 'line'
    };
    state.price = Number(state.price.toFixed(4));

    var els = {
        cashDisplay: document.getElementById('cashDisplay'),
        rateDisplay: document.getElementById('rateDisplay'),
        highDisplay: document.getElementById('highDisplay'),
        lowDisplay: document.getElementById('lowDisplay'),
        openInterestDisplay: document.getElementById('openInterestDisplay'),
        chart: document.getElementById('chart'),
        chartToggle: document.getElementById('chartToggle'),
        logList: document.getElementById('logList'),
        posBody: document.getElementById('posBody'),
        amount: document.getElementById('amount'),
        bellBtn: document.getElementById('bellBtn'),
        logModal: document.getElementById('logModal'),
        logClose: document.getElementById('logClose'),
        tabLong: document.getElementById('tabLong'),
        tabShort: document.getElementById('tabShort'),
        pvQty: document.getElementById('pvQty'),
        pvValue: document.getElementById('pvValue'),
        pvFee: document.getElementById('pvFee'),
        pvTotal: document.getElementById('pvTotal'),
        pvLiq: document.getElementById('pvLiq'),
        pvHint: document.getElementById('pvHint'),
        submitBtn: document.getElementById('submitBtn'),
        addModal: document.getElementById('addModal'),
        modalClose: document.getElementById('modalClose'),
        addAmount: document.getElementById('addAmount'),
        addConfirm: document.getElementById('addConfirm'),
        modalPosInfo: document.getElementById('modalPosInfo'),
        mAddQty: document.getElementById('mAddQty'),
        mAddMargin: document.getElementById('mAddMargin'),
        mAddFee: document.getElementById('mAddFee'),
        mAddTotal: document.getElementById('mAddTotal'),
        mAddHint: document.getElementById('mAddHint'),
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

    function pushEvent(ev) {
        ev.t = Date.now();
        ev.price = state.price;
        var lastPt = state.history.length ? state.history[state.history.length - 1] : null;
        ev.ax = lastPt ? lastPt.t : ev.t;
        ev.av = lastPt ? lastPt.v : ev.price;
        state.events.push(ev);
        if (state.events.length > 200) state.events.shift();
        var cutoff = Date.now() - WINDOW_MS;
        while (state.history.length && state.history[0].t < cutoff) state.history.shift();
        pushKline(ev.t, ev.price);
    }

    function pushKline(t, v) {
        var key = 'b' + Math.floor((t - startTime) / KLINE_MS);
        var last = state.kline[state.kline.length - 1];
        if (!last || last.key !== key) {
            state.kline.push({ key: key, t: t, open: v, close: v, high: v, low: v });
        } else {
            last.close = v;
            if (v > last.high) last.high = v;
            if (v < last.low) last.low = v;
        }
        if (state.kline.length > 5) state.kline.shift();
    }

    function maxNotional(lev, cash) {
        return cash / (1 / lev + FEE_RATE);
    }

    function setHint(el, text, error) {
        el.textContent = text;
        el.classList.toggle('is-error', !!error);
    }

    function totalPosQty() {
        var q = 0;
        for (var i = 0; i < state.positions.length; i++) q += state.positions[i].qty;
        return q;
    }

    function updateMarket() {
        els.cashDisplay.textContent = fmt(state.cash, 4) + ' Mels';
        els.rateDisplay.textContent = fmt(state.price, 4) + ' Mels = 1 Molss';
        els.highDisplay.textContent = fmt(state.high, 4);
        els.lowDisplay.textContent = fmt(state.low, 4);
        els.openInterestDisplay.textContent = fmt(totalPosQty(), 4);
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
                '<span class="pos-cell">' + fmt(p.qty, 4) + '</span>' +
                '<span class="pos-cell">' + fmt(p.entry, 4) + '</span>' +
                '<span class="pos-cell">' + p.lev + 'x</span>' +
                '<span class="pos-cell">' + fmt(p.margin, 4) + '</span>' +
                '<span class="pos-cell">' + fmt(liqPrice(p), 4) + '</span>' +
                '<span class="pos-cell ' + pnlCls + '">' + (pnl >= 0 ? '+' : '') + fmt(pnl, 4) + '</span>' +
                '<span class="pos-cell">' +
                '<button type="button" class="act-add" data-act="add" data-idx="' + i + '"><i class="fa-solid fa-plus"></i></button>' +
                '<button type="button" class="act-close" data-act="close" data-idx="' + i + '"><i class="fa-solid fa-money-bill-transfer"></i></button>' +
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

    function orderCost() {
        var spend = Number(els.amount.value) || 0;
        var qty = spend / state.price;
        var margin = spend / orderLev;
        var fee = spend * FEE_RATE;
        return { spend: spend, qty: qty, margin: margin, fee: fee, total: margin + fee };
    }

    function calcPreview() {
        var c = orderCost();
        els.pvQty.textContent = fmt(c.qty, 4) + ' Molss';
        els.pvValue.textContent = fmt(c.margin, 4) + ' Mels';
        els.pvFee.textContent = fmt(c.fee, 4) + ' Mels';
        els.pvTotal.textContent = fmt(c.total, 4) + ' Mels';
        els.pvLiq.textContent = (orderSide === 'long'
            ? fmt(state.price * (1 - 1 / orderLev), 4)
            : fmt(state.price * (1 + 1 / orderLev), 4)) + ' Mels';
        els.amount.max = String(Math.floor(maxNotional(orderLev, state.cash) * 10000) / 10000);
        if (c.spend <= 0) {
            setHint(els.pvHint, '请输入交易额', false);
        } else if (c.total > state.cash) {
            setHint(els.pvHint, '余额不足，最多可交易 ' + fmt(maxNotional(orderLev, state.cash), 4) + ' Mels', true);
        } else {
            setHint(els.pvHint, '', false);
        }
    }

    function openPosition() {
        var c = orderCost();
        if (c.spend <= 0) {
            showToast('交易额无效');
            return;
        }
        if (state.positions.length >= 5) {
            showToast('最多持有5个仓位');
            return;
        }
        if (c.total > state.cash) {
            showToast('余额不足，需 ' + fmt(c.total, 4) + ' Mels');
            return;
        }
        state.cash -= c.total;
        state.positions.push({
            side: orderSide,
            lev: orderLev,
            qty: c.qty,
            margin: c.margin,
            fees: c.fee,
            entry: state.price
        });
        pushLog(orderSide, orderSide === 'long' ? '开多' : '开空', fmt(c.spend, 4) + ' Mels @ ' + fmt(state.price, 4));
        pushEvent({ kind: 'open', side: orderSide, notional: c.spend, margin: c.margin, lev: orderLev });
        showToast((orderSide === 'long' ? '开多' : '开空') + '成功');
        updateMarket();
        renderPosition();
        calcPreview();
        drawChart();
    }

    function openAddModal(idx) {
        var p = state.positions[idx];
        if (!p) return;
        addTarget = p;
        els.modalPosInfo.innerHTML = '<span>仓位: <b>' + (p.side === 'long' ? '开多' : '开空') + ' ' + p.lev + 'x</b></span>' +
            '<span>当前数量: <b>' + fmt(p.qty, 4) + '</b></span>' +
            '<span>当前保证金: <b>' + fmt(p.margin, 4) + ' Mels</b></span>';
        els.addAmount.value = '100';
        els.addModal.classList.add('show');
        updateAddPreview();
    }

    function updateAddPreview() {
        var spend = Number(els.addAmount.value) || 0;
        var p = addTarget;
        if (!p) return;
        var addQty = spend / state.price;
        var addMargin = spend / p.lev;
        var fee = spend * FEE_RATE;
        var total = addMargin + fee;
        els.mAddQty.textContent = fmt(addQty, 4) + ' Molss';
        els.mAddMargin.textContent = fmt(addMargin, 4) + ' Mels';
        els.mAddFee.textContent = fmt(fee, 4) + ' Mels';
        els.mAddTotal.textContent = fmt(total, 4) + ' Mels';
        els.addAmount.max = String(Math.floor(maxNotional(p.lev, state.cash) * 10000) / 10000);
        if (spend <= 0) {
            setHint(els.mAddHint, '请输入加仓交易额', false);
        } else if (total > state.cash) {
            setHint(els.mAddHint, '余额不足，最多可加仓 ' + fmt(maxNotional(p.lev, state.cash), 4) + ' Mels', true);
        } else {
            setHint(els.mAddHint, '', false);
        }
    }

    function closeAddModal() {
        els.addModal.classList.remove('show');
        addTarget = null;
    }

    function confirmAdd() {
        if (addTarget === null) return;
        var p = addTarget;
        var spend = Number(els.addAmount.value) || 0;
        if (!(spend > 0)) {
            showToast('加仓交易额无效');
            return;
        }
        var addQty = spend / state.price;
        var addMargin = spend / p.lev;
        var fee = spend * FEE_RATE;
        var total = addMargin + fee;
        if (total > state.cash) {
            showToast('余额不足，需 ' + fmt(total, 4) + ' Mels');
            return;
        }
        var totalQty = p.qty + addQty;
        var weightedEntry = (p.entry * p.qty + state.price * addQty) / totalQty;
        state.cash -= total;
        p.qty = totalQty;
        p.margin += addMargin;
        p.fees += fee;
        p.entry = weightedEntry;
        pushLog('add', '加仓', fmt(spend, 4) + ' Mels @ ' + fmt(state.price, 4));
        pushEvent({ kind: 'add', side: p.side, notional: spend });
        showToast('加仓成功');
        closeAddModal();
        updateMarket();
        renderPosition();
        calcPreview();
        drawChart();
    }

    function closePosition(idx) {
        var p = state.positions[idx];
        if (!p) return;
        var pnl = pnlOf(p);
        var fee = state.price * p.qty * FEE_RATE;
        var net = pnl - p.fees - fee;
        state.cash += p.margin + pnl - fee;
        pushLog('close', '平仓', (net >= 0 ? '+' : '') + fmt(net, 4) + ' Mels');
        pushEvent({ kind: 'pnl', pnl: net });
        state.positions.splice(idx, 1);
        showToast('平仓成功');
        updateMarket();
        renderPosition();
        calcPreview();
        drawChart();
    }

    function liquidate(idx) {
        var p = state.positions[idx];
        if (!p) return;
        var loss = p.margin + p.fees;
        pushLog('liq', '爆仓', '-' + fmt(loss, 4) + ' Mels');
        pushEvent({ kind: 'liq', loss: loss });
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
        var delta = (Math.random() - 0.5) * state.price * VOL;
        var rel = state.price / PRICE_BASE - 1;
        var roll = Math.random();
        var pUp = 0.002;
        var pDown = 0.002;
        if (rel < 0) pUp += -rel * 0.015;
        if (rel > 0) pDown += rel * 0.015;
        if (roll < pUp) {
            delta = state.price * (0.04 + Math.random() * 0.03);
        } else if (roll < pUp + pDown) {
            delta = -state.price * (0.04 + Math.random() * 0.03);
        } else if (state.burst > 0) {
            delta *= 3;
            state.burst--;
        } else if (Math.random() < 0.006) {
            state.burst = 2 + Math.floor(Math.random() * 2);
            delta *= 3;
            state.burst--;
        }
        state.price = Math.max(0.00001, Number((state.price + delta).toFixed(4)));
        state.history.push({ t: Date.now(), v: state.price });
        pushKline(Date.now(), state.price);
        var cutoff = Date.now() - WINDOW_MS;
        while (state.history.length && state.history[0].t < cutoff) state.history.shift();
        state.high = -Infinity;
        state.low = Infinity;
        for (var hi = 0; hi < state.history.length; hi++) {
            if (state.history[hi].v > state.high) state.high = state.history[hi].v;
            if (state.history[hi].v < state.low) state.low = state.history[hi].v;
        }

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
        var isKline = state.chartMode === 'kline';
        var w = isKline ? minW : Math.max(minW, dataWidth(minW));
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

        var data = isKline ? state.kline : state.history;
        if (data.length < (isKline ? 1 : 2)) return;

        if (nearEnd) scrollEl.scrollLeft = scrollEl.scrollWidth;

        var padL = 12;
        var padR = 52;
        var padT = 16;
        var padB = 20;
        var plotW = w - padL - padR;
        var plotH = h - padT - padB;
        var min;
        var max;
        if (isKline) {
            min = Infinity;
            max = -Infinity;
            for (var ki = 0; ki < data.length; ki++) {
                if (data[ki].low < min) min = data[ki].low;
                if (data[ki].high > max) max = data[ki].high;
            }
        } else {
            min = Math.min.apply(null, data.map(function (d) { return d.v; }));
            max = Math.max.apply(null, data.map(function (d) { return d.v; }));
        }
        var range = max - min || 1;

        ctx.strokeStyle = 'rgba(0,0,0,0.07)';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px ui-monospace, monospace';
        ctx.textAlign = 'left';
        for (var i = 0; i <= 4; i++) {
            var gy = padT + (plotH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padL, gy);
            ctx.lineTo(padL + plotW, gy);
            ctx.stroke();
            var val = max - (range / 4) * i;
            ctx.fillText(fmt(val, 4), padL + plotW + 6, gy + 3);
        }

        if (isKline) {
            drawKline(data, plotW, plotH, min, range, padL, padT);
        } else {
            drawLine(data, plotW, plotH, min, range, padL, padT);
            drawMarkers();
        }
    }

    function drawLine(data, plotW, plotH, min, range, padL, padT) {
        var t0 = data[0].t;
        var t1 = data[data.length - 1].t;
        var span = (t1 - t0) || 1;

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
    }

    function drawKline(data, plotW, plotH, min, range, padL, padT) {
        if (!data.length) return;
        var n = data.length;
        var bw = Math.min(46, plotW / (n + 1));
        var slot = plotW / n;
        for (var k = 0; k < n; k++) {
            var b = data[k];
            var up = b.close >= b.open;
            var color = up ? '#f43f5e' : '#00a86b';
            var cx = padL + slot * (k + 0.5);
            var yOpen = padT + plotH - ((b.open - min) / range) * plotH;
            var yClose = padT + plotH - ((b.close - min) / range) * plotH;
            var top = Math.min(yOpen, yClose);
            var bh = Math.max(2, Math.abs(yOpen - yClose));
            var yHigh = padT + plotH - ((b.high - min) / range) * plotH;
            var yLow = padT + plotH - ((b.low - min) / range) * plotH;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx, yHigh);
            ctx.lineTo(cx, yLow);
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.fillRect(cx - bw / 2, top, bw, bh);
        }
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
            var at = ev.ax || ev.t;
            if (at < t0) continue;
            var atc = Math.min(at, t1);
            var av = ev.av || ev.price;
            var x = padL + ((atc - t0) / span) * plotW;
            var y = padT + plotH - ((av - min) / range) * plotH;
            var dotColor = '#f97316';
            var textColor = '#f97316';
            var label = '爆仓';
            if (ev.kind === 'open') {
                dotColor = ev.side === 'long' ? '#f43f5e' : '#00a86b';
                textColor = dotColor;
                label = (ev.side === 'long' ? '开多' : '开空') + ' ' + fmt(ev.margin, 4) + ' ' + ev.lev + 'x';
            } else if (ev.kind === 'pnl') {
                dotColor = '#8b5cf6';
                textColor = ev.pnl >= 0 ? '#f43f5e' : '#00a86b';
                label = '平仓 ' + (ev.pnl >= 0 ? '+' : '') + fmt(ev.pnl, 4);
            } else if (ev.kind === 'add') {
                dotColor = '#8b5cf6';
                textColor = ev.side === 'long' ? '#f43f5e' : '#00a86b';
                label = '加仓 ' + fmt(ev.notional, 4);
            } else if (ev.kind === 'liq') {
                dotColor = '#f97316';
                textColor = '#f97316';
                label = '爆仓 -' + fmt(ev.loss, 4);
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
            els.submitBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i>购买';
            els.submitBtn.classList.remove('is-short');
            calcPreview();
        });
        els.tabShort.addEventListener('click', function () {
            orderSide = 'short';
            els.tabShort.classList.add('is-active');
            els.tabLong.classList.remove('is-active');
            els.submitBtn.innerHTML = '<i class="fa-solid fa-cart-plus"></i>购买';
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
        document.querySelectorAll('.add-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var input = btn.getAttribute('data-scope') === 'add' ? els.addAmount : els.amount;
                var current = Number(input.value) || 0;
                var add = btn.getAttribute('data-add');
                if (add === 'max') {
                    var lev = (btn.getAttribute('data-scope') === 'add' && addTarget !== null)
                        ? addTarget.lev
                        : orderLev;
                    var maxSpend = Math.floor(maxNotional(lev, state.cash) * 10000) / 10000;
                    input.value = Number(Math.max(0, maxSpend).toFixed(4));
                } else {
                    input.value = Number(Math.max(0, current + Number(add)).toFixed(4));
                }
                if (btn.getAttribute('data-scope') === 'add') updateAddPreview();
                else calcPreview();
            });
        });
        els.bellBtn.addEventListener('click', function () {
            renderLogs();
            els.logModal.classList.add('show');
        });
        els.logClose.addEventListener('click', function () {
            els.logModal.classList.remove('show');
        });
        els.logModal.addEventListener('click', function (e) {
            if (e.target === els.logModal) els.logModal.classList.remove('show');
        });
        document.querySelectorAll('.opt-btn[data-lev]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                orderLev = Number(btn.getAttribute('data-lev'));
                document.querySelectorAll('.opt-btn[data-lev]').forEach(function (b) { b.classList.remove('is-active'); });
                btn.classList.add('is-active');
                calcPreview();
            });
        });
        els.chartToggle.addEventListener('click', function () {
            state.chartMode = state.chartMode === 'line' ? 'kline' : 'line';
            els.chartToggle.textContent = state.chartMode === 'line' ? 'K线图' : '折线图';
            drawChart();
        });
    }

    state.high = state.price;
    state.low = state.price;
    state.history.push({ t: Date.now(), v: state.price });
    pushKline(Date.now(), state.price);
    updateMarket();
    renderPosition();
    renderLogs();
    calcPreview();
    drawChart();
    bind();
    setInterval(tick, TICK_MS);
})();
