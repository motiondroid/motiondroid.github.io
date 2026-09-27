(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hero title: split into words that slide up one by one
  var h1 = document.getElementById('heroTitle');
  if (h1) {
    var words = h1.textContent.trim().split(/\s+/);
    h1.innerHTML = words.map(function (w, i) {
      var cls = /^(actually|watch\.)$/.test(w) ? ' class="hl"' : '';
      return '<span class="w"><span' + cls + ' style="animation-delay:' + (0.15 + i * 0.05).toFixed(2) + 's">' + w + '</span></span>';
    }).join(' ');
  }

  // Film-strip sprocket holes
  var sp = document.getElementById('sprockets');
  if (sp) {
    var ns = 'http://www.w3.org/2000/svg';
    for (var x = 8; x < 480; x += 30) {
      [4, 110].forEach(function (y) {
        var r = document.createElementNS(ns, 'rect');
        r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', 10); r.setAttribute('height', 6); r.setAttribute('rx', 1);
        sp.appendChild(r);
      });
    }
  }

  // Waveform bars
  var wave = document.getElementById('wave');
  if (wave) {
    var bars = 60, playedUpto = Math.floor(bars * 0.34);
    for (var i = 0; i < bars; i++) {
      var el = document.createElement('i');
      el.style.height = (8 + Math.round(Math.abs(Math.sin(i * 0.5)) * 24 + Math.random() * 8)) + 'px';
      el.style.setProperty('--i', i);
      if (i < playedUpto) el.classList.add('played');
      wave.appendChild(el);
    }
  }

  // Count-up numbers
  function countUp(el) {
    var to = +el.dataset.to, start = null, dur = 1200;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Playhead moving across timeline + live timecode
  var playline = document.getElementById('playline'), tc = document.getElementById('tc');
  var playing = false;
  function startPlayhead() {
    if (!playline || playing || reduce) return;
    playing = true;
    var t0 = null, dur = 9000, total = 4 * 60 + 30;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function loop(t) {
      if (!t0) t0 = t;
      var p = ((t - t0) % dur) / dur;
      var w = playline.parentElement.clientWidth - 46;
      playline.style.transform = 'translateX(' + (p * w) + 'px)';
      var s = p * total;
      tc.textContent = '00:' + pad(Math.floor(s / 60)) + ':' + pad(Math.floor(s % 60)) + ':' + pad(Math.floor((s % 1) * 30));
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // Scroll reveal (fade + slide up)
  var revealEls = document.querySelectorAll('.reveal, .section-head');
  function show(el) {
    el.classList.add('in');
    if (el.id === 'scrubber') startPlayhead();
    el.querySelectorAll('.count').forEach(countUp);
  }
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
    document.querySelectorAll('.count').forEach(function (c) { c.textContent = c.dataset.to; });
  }

  // Scroll progress bar, parallax, active nav
  var bar = document.getElementById('progress');
  var para = document.querySelectorAll('[data-parallax]');
  var links = document.querySelectorAll('nav.tc-nav a');
  var secs = Array.prototype.map.call(links, function (a) { return document.querySelector(a.getAttribute('href')); });
  var ticking = false;
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    if (!reduce && y < innerHeight * 1.5) para.forEach(function (el) { el.style.transform = 'translateY(' + (y * +el.dataset.parallax) + 'px)'; });
    var cur = -1;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle('active', i === cur); });
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();
  // Showreel play
  var rv = document.getElementById('reelVideo'), rp = document.getElementById('reelPlay');
  if (rv && rp) {
    rp.addEventListener('click', function () { rv.controls = true; rv.play(); rv.parentElement.classList.add('playing'); });
    rv.addEventListener('ended', function () { rv.parentElement.classList.remove('playing'); rv.controls = false; rv.currentTime = 0; });
  }

  // Portrait: follows mouse slightly (3D tilt)
  var pt = document.querySelector('#portrait .pt-inner');
  if (pt && !reduce && matchMedia('(pointer:fine)').matches) {
    window.addEventListener('mousemove', function (e) {
      var x = (e.clientX / innerWidth - .5), y = (e.clientY / innerHeight - .5);
      pt.style.transform = 'perspective(900px) rotateY(' + (x * 8) + 'deg) rotateX(' + (-y * 6) + 'deg) translate(' + (x * 12) + 'px,' + (y * 8) + 'px)';
    });
  }
})();

// ---------- Recent work: hover preview + video modal ----------
(function () {
  var items = document.querySelectorAll('.work-item');
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var modal = document.getElementById('vmodal'), mv = document.getElementById('vmVideo');

  items.forEach(function (el) {
    var v = el.querySelector('video'), src = el.dataset.video;
    if (canHover && v) {
      el.addEventListener('mouseenter', function () {
        if (!v.src) v.src = src;
        v.currentTime = 0;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
        el.classList.add('previewing');
      });
      el.addEventListener('mouseleave', function () { v.pause(); el.classList.remove('previewing'); });
    }
    el.addEventListener('click', function () {
      if (v) v.pause();
      el.classList.remove('previewing');
      modal.classList.toggle('portrait', el.classList.contains('reel-card'));
      var th = el.querySelector('img'); if (th) mv.poster = th.src;
      mv.src = src; mv.muted = false;
      modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      var p = mv.play(); if (p && p.catch) p.catch(function () {});
    });
  });

  function close() {
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true');
    mv.pause(); mv.removeAttribute('src'); mv.load();
    document.body.style.overflow = '';
  }
  modal.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', close); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) close(); });
})();
