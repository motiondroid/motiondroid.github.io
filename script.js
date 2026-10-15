/* MotionDroid — site interactions */
(function () {
  var d = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- Loader → ready ---------- */
  function ready() { d.classList.add('ready'); }
  var loader = $('#loader');
  if (loader && d.classList.contains('is-loading')) {
    var count = $('#loaderCount'), bar = $('#loaderBar'), t0 = performance.now(), DUR = 1500;
    (function tick(now) {
      var p = Math.min(1, (now - t0) / DUR), e = 1 - Math.pow(1 - p, 3);
      count.textContent = Math.round(e * 100);
      bar.style.transform = 'scaleX(' + e + ')';
      if (p < 1) return requestAnimationFrame(tick);
      setTimeout(function () {
        loader.classList.add('out');
        d.classList.remove('is-loading');
        setTimeout(ready, 250);
        setTimeout(function () { loader.remove(); }, 1000);
      }, 200);
    })(t0);
  } else {
    requestAnimationFrame(function () { requestAnimationFrame(ready); });
  }

  /* ---------- Hero video + timecode ---------- */
  var hv = $('#heroVideo'), htc = $('#heroTc');
  if (hv && !reduce) { var pp = hv.play(); if (pp && pp.catch) pp.catch(function () {}); }
  if (htc) {
    var start = performance.now();
    setInterval(function () {
      var s = hv && !hv.paused && hv.currentTime ? hv.currentTime : (performance.now() - start) / 1000;
      var f = Math.floor(s * 25);
      htc.textContent = '00:' + pad(Math.floor(s / 60) % 60) + ':' + pad(Math.floor(s) % 60) + ':' + pad(f % 25);
    }, 40);
  }

  /* ---------- Nav state, progress, active link ---------- */
  var nav = $('#nav'), prog = $('#progress');
  var links = $$('.nav-links a');
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var ticking = false;
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('solid', y > 40);
    prog.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    var cur = -1;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < innerHeight * .4) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle('active', i === cur); });
    if (hv && !reduce) hv.style.transform = 'scale(1.06) translateY(' + (y * .15) + 'px)';
    ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* ---------- Scroll reveal + counters ---------- */
  function countUp(el) {
    var to = +el.dataset.to, t0 = null;
    (function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / 1400, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  var revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        e.target.querySelectorAll('.count').forEach(countUp);
        io.unobserve(e.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
    $$('.count').forEach(function (c) { c.textContent = c.dataset.to; });
  }

  /* ---------- Custom cursor (desktop) ---------- */
  var cur = $('#cursor');
  if (cur && matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    var mx = -100, my = -100, cx = -100, cy = -100;
    addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; cur.classList.add('on'); });
    document.addEventListener('mouseleave', function () { cur.classList.remove('on'); });
    (function loop() {
      cx += (mx - cx) * .2; cy += (my - cy) * .2;
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      requestAnimationFrame(loop);
    })();
    $$('.work-item').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cur.classList.add('big'); });
      el.addEventListener('mouseleave', function () { cur.classList.remove('big'); });
    });
    $$('a, button:not(.work-item), select, input, textarea').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cur.classList.add('link'); });
      el.addEventListener('mouseleave', function () { cur.classList.remove('link'); });
    });
  }

  /* ---------- Video modal ---------- */
  var modal = $('#vmodal'), mv = $('#vmVideo');
  function openVideo(src, poster, portrait) {
    modal.classList.toggle('portrait', !!portrait);
    if (poster) mv.poster = poster; else mv.removeAttribute('poster');
    mv.src = src; mv.muted = false;
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (hv) hv.pause();
    var p = mv.play(); if (p && p.catch) p.catch(function () {});
  }
  function closeVideo() {
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true');
    mv.pause(); mv.removeAttribute('src'); mv.load();
    document.body.style.overflow = '';
    if (hv && !reduce) { var p = hv.play(); if (p && p.catch) p.catch(function () {}); }
  }
  $$('[data-close]').forEach(function (b) { b.addEventListener('click', closeVideo); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) closeVideo(); });
  var pr = $('#playReel');
  if (pr) pr.addEventListener('click', function () { openVideo('showreel.mp4', 'showreel-thumbnail.jpg', false); });

  /* ---------- Work: hover preview + open ---------- */
  var canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  $$('.work-item').forEach(function (el) {
    var v = el.querySelector('video'), src = el.dataset.video, img = el.querySelector('img');
    if (canHover && v) {
      el.addEventListener('mouseenter', function () {
        if (!v.getAttribute('src')) v.src = src;
        try { v.currentTime = 0; } catch (e) {}
        var p = v.play(); if (p && p.catch) p.catch(function () {});
        el.classList.add('previewing');
      });
      el.addEventListener('mouseleave', function () { v.pause(); el.classList.remove('previewing'); });
    }
    el.addEventListener('click', function () {
      if (v) v.pause();
      el.classList.remove('previewing');
      openVideo(src, img ? img.src : '', el.classList.contains('work-reel'));
    });
  });

  /* ---------- Local time (IST) ---------- */
  var lt = $('#localTime');
  function clock() {
    try { lt.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }); } catch (e) {}
  }
  if (lt) { clock(); setInterval(clock, 30000); }

  /* ---------- Pricing → preselect project type ---------- */
  $$('.plan-cta').forEach(function (b) {
    b.addEventListener('click', function () { var s = $('#fType'); if (s) s.value = b.dataset.plan; });
  });

  /* ---------- Contact form (FormSubmit) ---------- */
  var form = $('#cform');
  if (form) {
    var status = $('#fStatus'), btn = form.querySelector('.f-submit'), label = btn.querySelector('.f-label');
    var ENDPOINT = 'https://formsubmit.co/ajax/motiondroid.in@gmail.com';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = false;
      form.querySelectorAll('[required]').forEach(function (f) {
        var ok = f.value.trim() && (f.type !== 'email' || /\S+@\S+\.\S+/.test(f.value));
        f.classList.toggle('invalid', !ok); if (!ok) bad = true;
      });
      if (bad) { status.className = 'f-status err'; status.textContent = 'Please add your name, a valid email and project details.'; return; }

      btn.disabled = true; label.textContent = 'Sending…'; status.className = 'f-status'; status.textContent = '';
      fetch(ENDPOINT, { method: 'POST', headers: { 'Accept': 'application/json' }, body: new FormData(form) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (String(res.success) === 'true') {
            status.className = 'f-status ok'; status.textContent = 'Thank you — your brief is in. I’ll get back to you soon.'; form.reset();
          } else { var err = new Error(res.message || 'failed'); err.server = res.message; throw err; }
        })
        .catch(function (err) {
          var fd = new FormData(form), lines = [];
          ['name', 'email', 'whatsapp', 'project_type', 'budget', 'deadline', 'message'].forEach(function (k) {
            var v = (fd.get(k) || '').toString().trim(); if (v) lines.push(k.replace('_', ' ') + ': ' + v);
          });
          var mail = 'mailto:motiondroid.in@gmail.com?subject=' + encodeURIComponent('Project enquiry — ' + (fd.get('name') || '')) +
                     '&body=' + encodeURIComponent(lines.join('\n'));
          status.className = 'f-status err';
          status.innerHTML = (err && err.server ? '<small style="display:block;opacity:.8;margin-bottom:4px">' + String(err.server).replace(/</g, '&lt;') + '</small>' : '') +
            'Couldn’t send from here. <a href="' + mail + '">Send it by email instead →</a>';
        })
        .finally(function () { btn.disabled = false; label.textContent = 'Send project brief'; });
    });
  }
})();
