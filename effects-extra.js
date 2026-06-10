(function(){

  /* ── SCROLL PROGRESS BAR ── */
  var bar = document.createElement('div');
  bar.id = 'scroll-progress';
  document.body.prepend(bar);
  window.addEventListener('scroll', function(){
    var s = document.documentElement;
    var pct = s.scrollTop / (s.scrollHeight - s.clientHeight) * 100;
    bar.style.width = pct + '%';
  }, {passive:true});

  /* ── NAV GLASSMORPHISM ── */
  var nav = document.querySelector('nav');
  if(nav){
    window.addEventListener('scroll', function(){
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, {passive:true});
  }

  /* ── RIPPLE ON BUTTONS ── */
  document.addEventListener('click', function(e){
    var btn = e.target.closest('.btn-primary,.btn-outline,.form-submit,.step-next-btn,.nav-cta,.hero-btn-main');
    if(!btn) return;
    var r = document.createElement('span');
    r.className = 'ripple';
    var rect = btn.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height);
    r.style.cssText = 'width:'+size+'px;height:'+size+'px;left:'+(e.clientX-rect.left-size/2)+'px;top:'+(e.clientY-rect.top-size/2)+'px;';
    btn.appendChild(r);
    setTimeout(function(){ r.remove(); }, 700);
  });

  /* ── SCROLL REVEAL OBSERVER ── */
  var revObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting) e.target.classList.add('visible');
    });
  }, {threshold:.12, rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal,.reveal-left,.reveal-right,.reveal-scale,.stagger-children').forEach(function(el){
    revObs.observe(el);
  });

  /* ── SECTION TITLE UNDERLINE ── */
  var titleObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting) e.target.classList.add('in-view');
    });
  }, {threshold:.3});
  document.querySelectorAll('.section-title').forEach(function(el){ titleObs.observe(el); });

  /* ── COUNTER ANIMATION ── */
  function animateCount(el){
    var target = parseFloat(el.dataset.target || el.textContent.replace(/[^0-9.]/g,''));
    var suffix = el.dataset.suffix || el.textContent.replace(/[0-9.]/g,'');
    var duration = 1400;
    var start = null;
    function step(ts){
      if(!start) start = ts;
      var progress = Math.min((ts-start)/duration, 1);
      var ease = 1 - Math.pow(1-progress, 3);
      var val = Math.round(ease * target);
      el.textContent = val + suffix;
      if(progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var countObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting && !e.target._counted){
        e.target._counted = true;
        animateCount(e.target);
      }
    });
  }, {threshold:.5});
  document.querySelectorAll('.count-up').forEach(function(el){
    el.dataset.target = parseFloat(el.textContent.replace(/[^0-9.]/g,''));
    el.dataset.suffix = el.textContent.replace(/[0-9.]/g,'');
    countObs.observe(el);
  });

  /* ── MAGNETIC BUTTONS ── */
  document.querySelectorAll('.btn-primary,.nav-cta,.hero-btn-main').forEach(function(btn){
    btn.addEventListener('mousemove', function(e){
      var r = btn.getBoundingClientRect();
      var x = (e.clientX - r.left - r.width/2) * 0.2;
      var y = (e.clientY - r.top - r.height/2) * 0.2;
      btn.style.transform = 'translate('+x+'px,'+y+'px) translateY(-4px)';
    });
    btn.addEventListener('mouseleave', function(){
      btn.style.transition = 'transform .4s cubic-bezier(.23,1,.32,1)';
      btn.style.transform = '';
      setTimeout(function(){ btn.style.transition = ''; }, 400);
    });
  });

  /* ── SPARKLE ON SECTION TITLES ── */
  document.querySelectorAll('.section-title').forEach(function(el){
    el.addEventListener('mouseenter', function(){
      for(var i=0;i<6;i++){
        (function(i){
          setTimeout(function(){
            var s = document.createElement('span');
            s.className = 'sparkle';
            s.textContent = ['✨','⭐','🌟','💫','🐾'][Math.floor(Math.random()*5)];
            s.style.cssText = 'position:absolute;left:'+(Math.random()*120-10)+'%;top:'+(Math.random()*120-60)+'%;font-size:'+(0.6+Math.random()*0.7)+'rem;z-index:10;pointer-events:none;';
            el.style.position='relative';
            el.appendChild(s);
            setTimeout(function(){ s.remove(); }, 900);
          }, i*80);
        })(i);
      }
    });
  });

  /* ── SMOOTH FADE-IN ON PAGE LOAD ── */
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity .5s ease';
  window.addEventListener('load', function(){ document.body.style.opacity = '1'; });
  if(document.readyState === 'complete') document.body.style.opacity = '1';

  /* ── PARALLAX HERO ── */
  var heroBg = document.querySelector('.hero-bg');
  if(heroBg){
    window.addEventListener('scroll', function(){
      heroBg.style.transform = 'translateY('+window.scrollY*0.28+'px) scale(1.06)';
    }, {passive:true});
  }

  /* ── 3D TILT AVANCÉ (mouse tracking) ── */
  function init3DTilt(selector){
    document.querySelectorAll(selector).forEach(function(card){
      card.style.transformStyle = 'preserve-3d';
      card.style.transition = 'transform .15s ease, box-shadow .15s ease';

      // Couche de reflet interne
      var shine = document.createElement('div');
      shine.style.cssText = 'position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:2;transition:opacity .3s;opacity:0;background:radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18) 0%, transparent 65%);';
      card.style.position = 'relative';
      card.style.overflow = 'hidden';
      card.appendChild(shine);

      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        var tiltX = (y - 0.5) * -20;
        var tiltY = (x - 0.5) * 20;
        card.style.transform = 'perspective(800px) rotateX('+tiltX+'deg) rotateY('+tiltY+'deg) scale(1.04) translateZ(10px)';
        card.style.boxShadow = (tiltY*1.5)+'px '+(tiltX*1.5+20)+'px 50px rgba(123,111,160,0.3)';
        shine.style.opacity = '1';
        shine.style.background = 'radial-gradient(circle at '+(x*100)+'% '+(y*100)+'%, rgba(255,255,255,0.2) 0%, transparent 65%)';
      });
      card.addEventListener('mouseleave', function(){
        card.style.transition = 'transform .5s cubic-bezier(.23,1,.32,1), box-shadow .5s';
        card.style.transform = '';
        card.style.boxShadow = '';
        shine.style.opacity = '0';
        setTimeout(function(){ card.style.transition = 'transform .15s ease, box-shadow .15s ease'; }, 500);
      });
    });
  }
  init3DTilt('.service-card,.avis-card,.t-card,.avis-global');

  /* ── 3D DEPTH LAYERS SUR HERO ── */
  var heroContent = document.querySelector('.hero-content');
  if(heroContent){
    var heroSection = document.getElementById('hero') || heroContent.closest('section');
    if(heroSection){
      heroSection.addEventListener('mousemove', function(e){
        var r = heroSection.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width/2) / r.width;
        var y = (e.clientY - r.top - r.height/2) / r.height;
        heroContent.style.transform = 'translate('+(x*12)+'px,'+(y*8)+'px)';
        heroContent.style.transition = 'transform .1s ease';
      });
      heroSection.addEventListener('mouseleave', function(){
        heroContent.style.transition = 'transform .6s cubic-bezier(.23,1,.32,1)';
        heroContent.style.transform = '';
      });
    }
  }

  /* ── FLOATING BLOBS 3D ── */
  var blobContainer = document.createElement('div');
  blobContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;';
  var blobColors = [
    'rgba(123,111,160,0.07)',
    'rgba(232,168,76,0.06)',
    'rgba(90,122,74,0.05)',
    'rgba(74,63,114,0.06)',
  ];
  for(var b=0;b<4;b++){
    (function(i){
      var blob = document.createElement('div');
      var size = 300 + i * 120;
      blob.style.cssText = [
        'position:absolute',
        'width:'+size+'px',
        'height:'+size+'px',
        'border-radius:60% 40% 70% 30% / 50% 60% 40% 50%',
        'background:'+blobColors[i],
        'filter:blur(40px)',
        'animation:blob-move-'+i+' '+(14+i*4)+'s ease-in-out infinite',
        'left:'+(10+i*20)+'%',
        'top:'+(10+i*15)+'%',
        'will-change:transform',
      ].join(';');
      blobContainer.appendChild(blob);
      var style = document.createElement('style');
      style.textContent = '@keyframes blob-move-'+i+'{0%,100%{transform:translate(0,0) scale(1) rotate(0deg);}33%{transform:translate('+(30-i*10)+'px,'+(20+i*8)+'px) scale(1.08) rotate(60deg);}66%{transform:translate('+(-(20+i*5))+'px,'+(30-i*6)+'px) scale(0.94) rotate(120deg);}}';
      document.head.appendChild(style);
    })(b);
  }
  document.body.appendChild(blobContainer);

  /* ── 3D PHOTO TILT (galerie) ── */
  document.querySelectorAll('.fcp,.photo,.tp,.ap,.mc').forEach(function(img){
    img.style.transformStyle = 'preserve-3d';
    img.addEventListener('mousemove', function(e){
      var r = img.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      img.style.transform = 'perspective(600px) rotateX('+((y-0.5)*-15)+'deg) rotateY('+((x-0.5)*15)+'deg) scale(1.07) translateZ(8px)';
      img.style.filter = 'brightness(1.1) saturate(1.2)';
    });
    img.addEventListener('mouseleave', function(){
      img.style.transform = '';
      img.style.filter = '';
    });
  });

  /* ── 3D TEXT SHADOW SUR TITRES ── */
  document.querySelectorAll('h1,h2.section-title').forEach(function(el){
    el.addEventListener('mousemove', function(e){
      var r = el.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width - 0.5) * 12;
      var y = ((e.clientY - r.top) / r.height - 0.5) * 8;
      el.style.textShadow = (-x*0.5)+'px '+(-y*0.5)+'px 0 rgba(74,63,114,0.15), '+(-x)+'px '+(-y)+'px 0 rgba(74,63,114,0.08), '+(-x*1.5)+'px '+(-y*1.5)+'px 20px rgba(123,111,160,0.15)';
    });
    el.addEventListener('mouseleave', function(){
      el.style.textShadow = '';
    });
  });

  /* cursor trail supprimé — on garde uniquement les pattes */

  /* ── CARD FLIP 3D (au clic sur étapes) ── */
  document.querySelectorAll('.p-step').forEach(function(step){
    step.style.perspective = '1000px';
    step.style.cursor = 'pointer';
    var flipped = false;
    step.addEventListener('click', function(){
      flipped = !flipped;
      step.style.transition = 'transform .5s cubic-bezier(.23,1,.32,1)';
      step.style.transform = flipped ? 'rotateY(8deg) scale(1.03)' : '';
      setTimeout(function(){ step.style.transform = ''; }, 500);
    });
  });

  /* ── PARALLAX MULTI-COUCHES AU SCROLL ── */
  window.addEventListener('scroll', function(){
    var sy = window.scrollY;
    document.querySelectorAll('[data-parallax]').forEach(function(el){
      var speed = parseFloat(el.dataset.parallax) || 0.2;
      el.style.transform = 'translateY('+(sy*speed)+'px)';
    });
  }, {passive:true});

  /* ── 3D HOVER SUR CONTACT BOX / PARRAINAGE ── */
  document.querySelectorAll('.contact-box,.parrainage-box,.resa-form').forEach(function(box){
    box.addEventListener('mousemove', function(e){
      var r = box.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      box.style.transform = 'perspective(1000px) rotateX('+((y-0.5)*-6)+'deg) rotateY('+((x-0.5)*6)+'deg) translateY(-4px)';
      box.style.transition = 'transform .1s ease';
    });
    box.addEventListener('mouseleave', function(){
      box.style.transition = 'transform .5s cubic-bezier(.23,1,.32,1)';
      box.style.transform = '';
    });
  });

  /* ── NEON GLOW AU HOVER SUR STEP-NUM ── */
  document.querySelectorAll('.step-num').forEach(function(el){
    el.addEventListener('mouseenter', function(){
      el.style.boxShadow = '0 0 0 4px rgba(232,168,76,0.2), 0 0 20px rgba(232,168,76,0.6), 0 0 40px rgba(232,168,76,0.3), 0 0 80px rgba(232,168,76,0.1)';
      el.style.transform = 'scale(1.2) rotate(-8deg)';
    });
    el.addEventListener('mouseleave', function(){
      el.style.boxShadow = '';
      el.style.transform = '';
    });
  });

})();
