/**
 * Интерактивная карта травмпунктов • Первая помощь рядом
 * Версия без API-ключей (Leaflet.js + CartoDB Positron / Dark Matter)
 * Соответствует принципам WCAG 2.1, Graceful Degradation и Mobile-First
 */

(function () {
  'use strict';

  // Встроенный датасет для гарантированной работы офлайн и по протоколу file://
  var defaultCenters = [
    {
      id: 1,
      name: "Травматологический пункт ГКБ им. С.П. Боткина",
      type: "adult",
      is24h: true,
      address: "2-й Боткинский проезд, д. 5, корп. 22",
      phone: "+7 (495) 945-00-45",
      metro: "Беговая / Динамо",
      hours: "Круглосуточно (24/7)",
      lat: 55.773634,
      lng: 37.558342,
      desc: "Экстренный круглосуточный приём взрослых пациентов с переломами, вывихами и ранами. Рентген, операционные."
    },
    {
      id: 2,
      name: "Детский травмпункт НИИ НДХиТ (Клиника Рошаля)",
      type: "child",
      is24h: true,
      address: "ул. Большая Полянка, д. 22",
      phone: "+7 (495) 959-57-48",
      metro: "Полянка",
      hours: "Круглосуточно (24/7)",
      lat: 55.738125,
      lng: 37.618641,
      desc: "Ведущий детский травматологический центр. Экстренная хирургическая и травматологическая помощь детям до 18 лет."
    },
    {
      id: 3,
      name: "Травмпункт НИИ скорой помощи им. Н.В. Склифосовского",
      type: "adult",
      is24h: true,
      address: "Большая Сухаревская пл., д. 3, стр. 1",
      phone: "+7 (495) 680-41-54",
      metro: "Сухаревская / Проспект Мира",
      hours: "Круглосуточно (24/7)",
      lat: 55.772819,
      lng: 37.632291,
      desc: "Экстренная специализированная помощь при тяжёлых переломах, сочетанных травмах, ранах и ожогах."
    },
    {
      id: 4,
      name: "Детский травмпункт ДГКБ № 13 им. Н.Ф. Филатова",
      type: "child",
      is24h: true,
      address: "ул. Садовая-Кудринская, д. 15, корп. 2",
      phone: "+7 (499) 254-34-30",
      metro: "Баррикадная / Маяковская",
      hours: "Круглосуточно (24/7)",
      lat: 55.764512,
      lng: 37.589871,
      desc: "Круглосуточный приём детей и подростков. Наложение полимерных и гипсовых повязок, рентгенография, УЗИ."
    },
    {
      id: 5,
      name: "Травматологическое отделение ГКБ № 1 им. Н.И. Пирогова",
      type: "adult",
      is24h: true,
      address: "Ленинский проспект, д. 8, корп. 1",
      phone: "+7 (495) 536-91-16",
      metro: "Октябрьская / Шаболовская",
      hours: "Круглосуточно (24/7)",
      lat: 55.724781,
      lng: 37.604218,
      desc: "Первая Градская больница. Полный спектр амбулаторной и стационарной травматологии и ортопедии."
    },
    {
      id: 6,
      name: "Детский травмпункт Морозовской ДГКБ",
      type: "child",
      is24h: true,
      address: "4-й Добрынинский пер., д. 1/9, стр. 21",
      phone: "+7 (495) 959-88-00",
      metro: "Добрынинская / Серпуховская",
      hours: "Круглосуточно (24/7)",
      lat: 55.726915,
      lng: 37.620144,
      desc: "Неотложная помощь детям при ушибах, вывихах, переломах конечностей. Экспресс-диагностика и вакцинация от столбняка."
    },
    {
      id: 7,
      name: "Травматологический пункт ГП № 220 (ЦАО)",
      type: "adult",
      is24h: false,
      address: "ул. Заморенова, д. 27",
      phone: "+7 (499) 255-00-24",
      metro: "Улица 1905 года / Краснопресненская",
      hours: "Пн-Пт: 08:00 - 20:00, Сб: 09:00 - 18:00",
      lat: 55.759841,
      lng: 37.568412,
      desc: "Амбулаторное травматологическое отделение. Первичная хирургическая обработка, рентген, перевязки."
    },
    {
      id: 8,
      name: "Травматологический центр ГКБ № 67 им. Л.А. Ворохобова",
      type: "adult",
      is24h: true,
      address: "ул. Саляма Адиля, д. 2/44, стр. 1",
      phone: "+7 (495) 530-33-03",
      metro: "Народное Ополчение / Полежаевская",
      hours: "Круглосуточно (24/7)",
      lat: 55.776102,
      lng: 37.472915,
      desc: "Многопрофильный круглосуточный травмпункт СЗАО. Компьютерная томография, рентген, противошоковая палата."
    }
  ];

  var map = null;
  var tileLayer = null;
  var markers = {};
  var userMarker = null;
  var centersData = defaultCenters.slice();
  var userCoords = null; // { lat, lng }
  var currentCategory = 'all';
  var searchQuery = '';

  // Формула гаверсинусов (Haversine) для расчета расстояния в км
  function calcDistanceKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Радиус Земли в км
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Создание кастомных SVG маркеров
  function createCustomIcon(type, is24h) {
    var bgColor = type === 'child' ? '#2e7d32' : (is24h ? '#c62828' : '#e65100');
    var badgeText = type === 'child' ? '👶' : (is24h ? '✚' : '🏥');
    
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">' +
      '<path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 28 18 28s18-14.5 18-28C36 8.06 27.94 0 18 0z" fill="' + bgColor + '" stroke="#ffffff" stroke-width="2"/>' +
      '<circle cx="18" cy="18" r="12" fill="#ffffff"/>' +
      '<text x="18" y="23" font-size="14" text-anchor="middle" font-family="system-ui, sans-serif">' + badgeText + '</text>' +
      '</svg>';

    return L.divIcon({
      className: 'custom-map-marker',
      html: svg,
      iconSize: [36, 46],
      iconAnchor: [18, 46],
      popupAnchor: [0, -42]
    });
  }

  // Инициализация картографического слоя ArcGIS World Street Map
  // Полностью открытый, работает без API-ключей, без водяных знаков и без блокировок по протоколу file://
  function updateTileLayer() {
    if (!map || tileLayer) return;

    tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      maxNativeZoom: 17,
      attribution: 'Tiles &copy; Esri &mdash; Sources: Esri, DeLorme, NAVTEQ, TomTom, USGS, OpenStreetMap'
    }).addTo(map);
  }

  // Инициализация карты Leaflet
  function initMap() {
    var mapContainer = document.getElementById('trauma-map');
    if (!mapContainer) return;

    if (typeof L === 'undefined') {
      console.warn('Leaflet библиотека недоступна. Список травмпунктов работает в автономном режиме.');
      var fallbackAlert = document.getElementById('map-fallback-alert');
      if (fallbackAlert) fallbackAlert.style.display = 'block';
      return;
    }

    // Дефолтный центр (Москва)
    var defaultCenter = [55.753215, 37.622504];

    map = L.map('trauma-map', {
      center: defaultCenter,
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: false
    });

    updateTileLayer();

    // Слушатель смены темы оформления
    var themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', function () {
        setTimeout(updateTileLayer, 100);
      });
    }

    // Рендер маркеров
    renderMarkers();

    // Защита от серого экрана: принудительный пересчет размеров
    setTimeout(function () {
      if (map) map.invalidateSize();
    }, 250);

    window.addEventListener('resize', function () {
      if (map) map.invalidateSize();
    });
  }

  // Отрисовка маркеров на карте
  function renderMarkers() {
    if (!map) return;

    // Очистить старые маркеры
    Object.keys(markers).forEach(function (id) {
      map.removeLayer(markers[id]);
    });
    markers = {};

    var filtered = getFilteredCenters();

    filtered.forEach(function (item) {
      var icon = createCustomIcon(item.type, item.is24h);
      var marker = L.marker([item.lat, item.lng], { icon: icon }).addTo(map);

      var distanceHtml = item.distance !== undefined
        ? '<div class="popup-dist">📍 Расстояние: <strong>' + item.distance.toFixed(1) + ' км</strong></div>'
        : '';

      var routeUrl = 'https://yandex.ru/maps/?rtext=' +
        (userCoords ? userCoords.lat + ',' + userCoords.lng : '') +
        '~' + item.lat + ',' + item.lng + '&rtt=auto';

      var popupContent = '<div class="map-popup-card">' +
        '<h4>' + item.name + '</h4>' +
        '<p class="popup-addr">' + item.address + (item.metro ? ' (м. ' + item.metro + ')' : '') + '</p>' +
        '<p class="popup-hours">⏱ ' + item.hours + '</p>' +
        distanceHtml +
        '<div class="popup-actions">' +
          '<a href="tel:' + item.phone.replace(/[^0-9+]/g, '') + '" class="popup-btn popup-call">📞 Позвонить</a>' +
          '<a href="' + routeUrl + '" target="_blank" rel="noopener noreferrer" class="popup-btn popup-route">🗺️ Маршрут</a>' +
        '</div>' +
      '</div>';

      marker.bindPopup(popupContent, { maxWidth: 280 });

      marker.on('click', function () {
        highlightCard(item.id);
      });

      markers[item.id] = marker;
    });

    // Если есть маркеры, подстраиваем зум
    if (filtered.length > 0) {
      var group = new L.featureGroup(Object.values(markers));
      if (userMarker) group.addLayer(userMarker);
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }

  // Фильтрация данных
  function getFilteredCenters() {
    return centersData.filter(function (item) {
      // Категория
      if (currentCategory === 'child' && item.type !== 'child') return false;
      if (currentCategory === 'adult' && item.type !== 'adult') return false;
      if (currentCategory === '24h' && !item.is24h) return false;

      // Поисковая строка
      if (searchQuery) {
        var q = searchQuery.toLowerCase();
        var matchName = item.name.toLowerCase().indexOf(q) !== -1;
        var matchAddr = item.address.toLowerCase().indexOf(q) !== -1;
        var matchMetro = item.metro && item.metro.toLowerCase().indexOf(q) !== -1;
        if (!matchName && !matchAddr && !matchMetro) return false;
      }

      return true;
    });
  }

  // Рендер списка карточек травмпунктов
  function renderList() {
    var container = document.getElementById('centers-list');
    var countEl = document.getElementById('centers-count');
    if (!container) return;

    var filtered = getFilteredCenters();

    if (countEl) {
      countEl.textContent = 'Найдено: ' + filtered.length;
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div class="no-results-card">' +
        '<div class="no-results-icon">🔍</div>' +
        '<h3>Травмпункты не найдены</h3>' +
        '<p>Попробуйте изменить запрос или сбросить фильтры.</p>' +
      '</div>';
      return;
    }

    var html = '';
    filtered.forEach(function (item) {
      var badgeClass = item.type === 'child' ? 'badge-child' : (item.is24h ? 'badge-24h' : 'badge-regular');
      var badgeLabel = item.type === 'child' ? '👶 Детский травмпункт' : (item.is24h ? '🌙 Круглосуточно (24/7)' : '🏥 Взрослый приём');

      var distBadge = item.distance !== undefined
        ? '<span class="item-dist-pill">📍 ' + item.distance.toFixed(1) + ' км</span>'
        : '';

      var routeUrl = 'https://yandex.ru/maps/?rtext=' +
        (userCoords ? userCoords.lat + ',' + userCoords.lng : '') +
        '~' + item.lat + ',' + item.lng + '&rtt=auto';

      html += '<article class="trauma-card" id="trauma-card-' + item.id + '" data-id="' + item.id + '" tabindex="0" role="button" aria-label="' + item.name + '">' +
        '<div class="trauma-card-header">' +
          '<span class="trauma-type-badge ' + badgeClass + '">' + badgeLabel + '</span>' +
          distBadge +
        '</div>' +
        '<h3 class="trauma-card-title">' + item.name + '</h3>' +
        '<p class="trauma-card-address">📍 ' + item.address + (item.metro ? ' <span class="metro-tag">🚇 ' + item.metro + '</span>' : '') + '</p>' +
        '<p class="trauma-card-hours">⏱ <strong>Режим:</strong> ' + item.hours + '</p>' +
        '<p class="trauma-card-desc">' + item.desc + '</p>' +
        '<div class="trauma-card-actions">' +
          '<a href="tel:' + item.phone.replace(/[^0-9+]/g, '') + '" class="action-btn call-action-btn">📞 ' + item.phone + '</a>' +
          '<a href="' + routeUrl + '" target="_blank" rel="noopener noreferrer" class="action-btn route-action-btn">🗺️ Маршрут</a>' +
        '</div>' +
      '</article>';
    });

    container.innerHTML = html;

    // Привязка кликов по карточкам
    var cards = container.querySelectorAll('.trauma-card');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var id = parseInt(card.getAttribute('data-id'), 10);
        focusCenterOnMap(id);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          var id = parseInt(card.getAttribute('data-id'), 10);
          focusCenterOnMap(id);
        }
      });
    });
  }

  // Фокусировка на маркере при клике на карточку
  function focusCenterOnMap(id) {
    var center = centersData.find(function (c) { return c.id === id; });
    if (!center) return;

    highlightCard(id);

    if (map) {
      map.flyTo([center.lat, center.lng], 15, { duration: 1 });
      if (markers[id]) {
        setTimeout(function () {
          markers[id].openPopup();
        }, 500);
      }
    }

    // Если на мобильном активна вкладка списка, переключаем на карту при клике
    var mapTabBtn = document.getElementById('tab-show-map');
    if (window.innerWidth <= 860 && mapTabBtn) {
      mapTabBtn.click();
    }
  }

  // Подсветка карточки в списке
  function highlightCard(id) {
    var cards = document.querySelectorAll('.trauma-card');
    cards.forEach(function (c) { c.classList.remove('active-card'); });

    var target = document.getElementById('trauma-card-' + id);
    if (target) {
      target.classList.add('active-card');
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Определение геолокации пользователя с жестким тайм-аутом
  function requestGeolocation() {
    var statusEl = document.getElementById('geo-status-badge');
    if (!statusEl) return;

    if (!navigator.geolocation) {
      statusEl.textContent = '📍 Геолокация не поддерживается браузером';
      return;
    }

    statusEl.innerHTML = '<span class="geo-spinner"></span> Определение ближайших травмпунктов...';

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        userCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };

        // Рассчитываем дистанцию до всех пунктов
        centersData.forEach(function (item) {
          item.distance = calcDistanceKm(userCoords.lat, userCoords.lng, item.lat, item.lng);
        });

        // Сортируем по возрастанию расстояния
        centersData.sort(function (a, b) {
          return a.distance - b.distance;
        });

        statusEl.innerHTML = '📍 Ваше местоположение определено. Травмпункты отсортированы по близости';
        statusEl.classList.add('geo-active');

        // Добавляем маркер пользователя на карту
        if (map) {
          if (userMarker) map.removeLayer(userMarker);

          var userIcon = L.divIcon({
            className: 'user-geo-marker',
            html: '<div class="user-pulse-dot"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
            .addTo(map)
            .bindPopup('<strong>Вы находитесь здесь</strong>');

          map.setView([userCoords.lat, userCoords.lng], 13);
        }

        renderList();
        renderMarkers();
      },
      function (err) {
        console.warn('Геолокация недоступна:', err.message);
        statusEl.innerHTML = '📍 Местоположение по умолчанию (Москва). Травмпункты отсортированы по алфавиту';
        renderList();
        renderMarkers();
      },
      {
        timeout: 4500,
        enableHighAccuracy: false
      }
    );
  }

  // Навешивание слушателей фильтров и поиска
  function setupControls() {
    // Чипсы категорий
    var chips = document.querySelectorAll('.map-chips .chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        currentCategory = chip.getAttribute('data-category');
        renderList();
        renderMarkers();
      });
    });

    // Строка поиска
    var searchInput = document.getElementById('map-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        searchQuery = e.target.value.trim();
        renderList();
        renderMarkers();
      });
    }

    // Переключатель табов на мобильных (Список / Карта)
    var tabListBtn = document.getElementById('tab-show-list');
    var tabMapBtn = document.getElementById('tab-show-map');
    var listCol = document.getElementById('map-list-col');
    var mapCol = document.getElementById('map-view-col');

    if (tabListBtn && tabMapBtn && listCol && mapCol) {
      tabListBtn.addEventListener('click', function () {
        tabListBtn.classList.add('active');
        tabMapBtn.classList.remove('active');
        listCol.classList.remove('hidden-mobile');
        mapCol.classList.add('hidden-mobile');
      });

      tabMapBtn.addEventListener('click', function () {
        tabMapBtn.classList.add('active');
        tabListBtn.classList.remove('active');
        mapCol.classList.remove('hidden-mobile');
        listCol.classList.add('hidden-mobile');
        if (map) {
          setTimeout(function () { map.invalidateSize(); }, 150);
        }
      });
    }
  }

  // Загрузка JSON данных (с безопасным fallback на встроенные)
  function loadDataAndStart() {
    fetch('data/trauma-centers.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          centersData = data;
        }
      })
      .catch(function () {
        // Fallback на defaultCenters уже активен
      })
      .finally(function () {
        initMap();
        renderList();
        setupControls();
        requestGeolocation();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDataAndStart);
  } else {
    loadDataAndStart();
  }
})();
