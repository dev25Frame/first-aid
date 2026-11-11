/**
 * Видеоматериалы • Первая помощь рядом
 * Интерактивная карусель обучающих видеороликов (VK Видео / RuTube)
 * Соответствует принципам WCAG 2.1 (управление с клавиатуры, ARIA-атрибуты, поддержка свайпов)
 */

(function () {
  'use strict';

  var videos = [
    {
      id: 1,
      title: 'Что делать, если человек рядом потерял сознание или подавился?',
      source: 'Российский Красный Крест • Инструктор Денис Моисеев',
      badge: '🔴 Красный Крест',
      badgeClass: 'badge-red',
      desc: 'Базовый алгоритм спасения жизни: проверка сознания и дыхания, перевод в устойчивое боковое положение и приём Геймлиха при удушье.',
      embedUrl: 'https://vkvideo.ru/video_ext.php?oid=-212510635&id=456240645&hd=2',
      directUrl: 'https://vkvideo.ru/video-212510635_456240645?list=119526689f4af5d0ac'
    },
    {
      id: 2,
      title: 'Будни реанимации: от первой помощи до борьбы за жизнь',
      source: 'Проект «Раскадровка»',
      badge: '🩹 Травмы и кровотечения',
      badgeClass: 'badge-trauma',
      desc: 'Интервью с врачами-реаниматологами и сотрудниками скорой помощи о спасении жизней в критических ситуациях. В видео разбираются основы сердечно-лёгочной реанимации (соотношение 30 компрессий к 2 вдохам), а также устройство и оснащение реанимационного автомобиля.',
      embedUrl: 'https://vkvideo.ru/video_ext.php?oid=-212510635&id=456239558&hd=2',
      directUrl: 'https://vkvideo.ru/video-212510635_456239558'
    },
    {
      id: 3,
      title: 'Наперегонки со смертью: день с бригадой скорой помощи',
      source: 'Служба экстренной медицинской помощи и «СПЕКТР»',
      badge: '🚑 Будни медиков',
      badgeClass: 'badge-cpr',
      desc: 'Документальный репортаж о суточной смене фельдшера скорой: реальные вызовы, работа в экстремальных условиях и цена спасения жизней.',
      embedUrl: 'https://vkvideo.ru/video_ext.php?oid=-154615935&id=456239178&hd=2',
      directUrl: 'https://vkvideo.ru/video-154615935_456239178'
    }
  ];

  var currentIndex = 0;

  function initCarousel() {
    var iframe = document.getElementById('active-video-iframe');
    var badgeEl = document.getElementById('video-badge');
    var titleEl = document.getElementById('video-title');
    var descEl = document.getElementById('video-desc');
    var sourceEl = document.getElementById('video-source');
    var directLinkEl = document.getElementById('video-direct-link');
    var prevSideCard = document.getElementById('video-prev-side');
    var nextSideCard = document.getElementById('video-next-side');
    var prevSideLabel = document.getElementById('video-prev-label');
    var nextSideLabel = document.getElementById('video-next-label');
    var dotsContainer = document.getElementById('video-dots');
    var prevBtn = document.getElementById('video-nav-prev');
    var nextBtn = document.getElementById('video-nav-next');
    var carouselArea = document.querySelector('.video-carousel');

    if (!iframe || !titleEl) return;

    // Build dots
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      videos.forEach(function (_, i) {
        var dot = document.createElement('button');
        dot.className = 'video-dot' + (i === 0 ? ' active' : '');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Перейти к видео ' + (i + 1));
        dot.addEventListener('click', function () {
          setVideo(i);
        });
        dotsContainer.appendChild(dot);
      });
    }

    function setVideo(index) {
      if (index < 0) index = videos.length - 1;
      if (index >= videos.length) index = 0;
      currentIndex = index;

      var current = videos[currentIndex];
      var prevIndex = (currentIndex - 1 + videos.length) % videos.length;
      var nextIndex = (currentIndex + 1) % videos.length;
      var prevVideo = videos[prevIndex];
      var nextVideo = videos[nextIndex];

      // Update iframe source only if different to avoid flickering/reload
      if (iframe.src !== current.embedUrl) {
        iframe.src = current.embedUrl;
      }
      iframe.title = current.title;

      // Update active text info
      if (badgeEl) {
        badgeEl.textContent = current.badge;
      }
      if (titleEl) {
        titleEl.textContent = current.title;
      }
      if (descEl) {
        descEl.textContent = current.desc;
      }
      if (sourceEl) {
        sourceEl.textContent = current.source;
      }
      if (directLinkEl) {
        directLinkEl.href = current.directUrl;
      }

      // Update side peek cards labels & ARIA
      if (prevSideCard) {
        prevSideCard.setAttribute('aria-label', 'Предыдущее видео: ' + prevVideo.title);
        prevSideCard.title = 'Предыдущее: ' + prevVideo.title;
      }
      if (prevSideLabel) {
        prevSideLabel.textContent = prevVideo.title;
      }

      if (nextSideCard) {
        nextSideCard.setAttribute('aria-label', 'Следующее видео: ' + nextVideo.title);
        nextSideCard.title = 'Следующее: ' + nextVideo.title;
      }
      if (nextSideLabel) {
        nextSideLabel.textContent = nextVideo.title;
      }

      // Update dots
      if (dotsContainer) {
        var dots = dotsContainer.querySelectorAll('.video-dot');
        dots.forEach(function (dot, i) {
          if (i === currentIndex) {
            dot.classList.add('active');
            dot.setAttribute('aria-current', 'true');
          } else {
            dot.classList.remove('active');
            dot.removeAttribute('aria-current');
          }
        });
      }
    }

    // Click handlers for side cards
    if (prevSideCard) {
      prevSideCard.addEventListener('click', function () {
        setVideo(currentIndex - 1);
      });
      prevSideCard.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setVideo(currentIndex - 1);
        }
      });
    }

    if (nextSideCard) {
      nextSideCard.addEventListener('click', function () {
        setVideo(currentIndex + 1);
      });
      nextSideCard.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setVideo(currentIndex + 1);
        }
      });
    }

    // Prev / Next button handlers (mobile and keyboard accessible)
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        setVideo(currentIndex - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        setVideo(currentIndex + 1);
      });
    }

    // Keyboard navigation (Left / Right arrow keys when carousel is focused)
    if (carouselArea) {
      carouselArea.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setVideo(currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setVideo(currentIndex + 1);
        }
      });

      // Touch swipe support for mobile/tablets
      var touchStartX = 0;
      var touchEndX = 0;
      carouselArea.addEventListener('touchstart', function (e) {
        if (e.changedTouches && e.changedTouches[0]) {
          touchStartX = e.changedTouches[0].screenX;
        }
      }, { passive: true });

      carouselArea.addEventListener('touchend', function (e) {
        if (e.changedTouches && e.changedTouches[0]) {
          touchEndX = e.changedTouches[0].screenX;
          var diff = touchEndX - touchStartX;
          if (Math.abs(diff) > 45) {
            if (diff > 0) {
              setVideo(currentIndex - 1); // Swiped right -> go to previous
            } else {
              setVideo(currentIndex + 1); // Swiped left -> go to next
            }
          }
        }
      }, { passive: true });
    }

    // Initialize with first video
    setVideo(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarousel);
  } else {
    initCarousel();
  }
})();
