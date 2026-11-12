/**
 * Интерактивная карта травмпунктов • Первая помощь рядом
 * Официальная интеграция Яндекс.Карты JS API v2.1 (Ключ 0898ed33-21d0-4e96-8e43-dc2c5466d146)
 * Гибридный поиск: проверенная база + автопоиск по геолокации
 * Соответствует принципам WCAG 2.1, Graceful Degradation и Mobile-First
 */

(function () {
  'use strict';

  // Базовый курированный датасет отделений с проверенными телефонами и статусом 24/7
  var curatedCenters = [
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

  var yMap = null;
  var placemarksMap = {};
  var userPlacemark = null;
  var autoSearchControl = null;
  var centersData = curatedCenters.slice();
  var userCoords = null; // { lat, lng }
  var currentCategory = 'all';
  var searchQuery = '';
  var isAutoSearchDone = false;

  // Формула гаверсинусов (Haversine formula) для точного расчета дистанции в км
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

  // Получение пресета иконки Яндекс.Карт в зависимости от типа учреждения
  function getYmapsPreset(type, is24h) {
    if (type === 'child') {
      return 'islands#darkGreenMedicalIcon';
    }
    return is24h ? 'islands#redMedicalIcon' : 'islands#orangeMedicalIcon';
  }

  // Инициализация невидимого поискового контроллера по организациям (Яндекс.Справочник)
  function initAutoSearchControl() {
    if (autoSearchControl || !yMap) return autoSearchControl;
    try {
      autoSearchControl = new ymaps.control.SearchControl({
        options: {
          provider: 'yandex#search',
          noPlacemark: true,
          noCentering: true,
          noPopup: true,
          resultsPerPage: 20,
          useMapBounds: true,
          float: 'none',
          position: { top: '-9999px', left: '-9999px' }
        }
      });
      yMap.controls.add(autoSearchControl);
    } catch (e) {
      console.warn('Не удалось инициализировать поиск организаций Яндекса:', e);
    }
    return autoSearchControl;
  }

  // Инициализация карты Яндекс
  function initYandexMap() {
    var mapContainer = document.getElementById('trauma-map');
    if (!mapContainer) return;

    if (typeof ymaps === 'undefined') {
      console.warn('API Яндекс Карт недоступно. Работает автономный режим списка.');
      var fallbackAlert = document.getElementById('map-fallback-alert');
      if (fallbackAlert) fallbackAlert.style.display = 'block';
      renderList();
      setupControls();
      requestGeolocation(false);
      return;
    }

    ymaps.ready(function () {
      var defaultCenter = [55.753215, 37.622504]; // Москва по умолчанию

      try {
        yMap = new ymaps.Map('trauma-map', {
          center: defaultCenter,
          zoom: 12,
          controls: ['zoomControl', 'geolocationControl', 'typeSelector', 'fullscreenControl']
        }, {
          searchControlProvider: 'yandex#search'
        });

        initAutoSearchControl();

        // Слушатель клика на стандартную кнопку геолокации в контролах Яндекса
        var geoControl = yMap.controls.get('geolocationControl');
        if (geoControl) {
          geoControl.events.add('locationchange', function (e) {
            var position = e.get('geoObjects').get(0);
            if (position) {
              var coords = position.geometry.getCoordinates();
              handleUserLocation(coords[0], coords[1]);
            }
          });
        }

        renderMarkers();
        renderList();
        setupControls();

        // Сразу запрашиваем геолокацию пользователя
        requestGeolocation(false);

      } catch (e) {
        console.error('Ошибка инициализации Яндекс Карт:', e);
        var fallbackAlert = document.getElementById('map-fallback-alert');
        if (fallbackAlert) fallbackAlert.style.display = 'block';
        renderList();
        setupControls();
        requestGeolocation(false);
      }
    });
  }

  // Отрисовка маркеров на карте Яндекса
  function renderMarkers() {
    if (!yMap) return;

    // Очистить существующие метки
    yMap.geoObjects.removeAll();
    placemarksMap = {};

    // Восстанавливаем метку пользователя, если определена
    if (userPlacemark) {
      yMap.geoObjects.add(userPlacemark);
    }

    var filtered = getFilteredCenters();

    filtered.forEach(function (item) {
      var routeUrl = 'https://yandex.ru/maps/?rtext=' +
        (userCoords ? userCoords.lat + ',' + userCoords.lng : '') +
        '~' + item.lat + ',' + item.lng + '&rtt=auto';

      var distText = item.distance !== undefined
        ? '<p><strong>📍 ' + item.distance.toFixed(1) + ' км от вас</strong></p>'
        : '';

      var balloonHtml = '<div class="ymaps-balloon-card">' +
        '<h4>' + item.name + '</h4>' +
        '<p>📍 ' + item.address + (item.metro ? ' (м. ' + item.metro + ')' : '') + '</p>' +
        '<p>📞 <strong>Телефон:</strong> <a href="tel:' + item.phone.replace(/[^0-9+]/g, '') + '" class="balloon-phone-link">' + item.phone + '</a></p>' +
        '<p>⏱ <strong>Режим:</strong> ' + item.hours + '</p>' +
        distText +
        '<div class="ymaps-balloon-actions">' +
          '<a href="tel:' + item.phone.replace(/[^0-9+]/g, '') + '" class="ymaps-balloon-btn ymaps-btn-call" title="Позвонить в регистратуру">📞 Позвонить</a>' +
          '<a href="' + routeUrl + '" target="_blank" rel="noopener noreferrer" class="ymaps-balloon-btn ymaps-btn-route" title="Маршрут в Яндекс.Картах">🗺️ Маршрут</a>' +
        '</div>' +
      '</div>';

      var placemark = new ymaps.Placemark([item.lat, item.lng], {
        balloonContentHeader: '<div class="ymaps-balloon-card"><h4>' + item.name + '</h4></div>',
        balloonContentBody: balloonHtml,
        hintContent: item.name
      }, {
        preset: getYmapsPreset(item.type, item.is24h),
        balloonMaxWidth: 290
      });

      placemark.events.add('click', function () {
        highlightCard(item.id);
      });

      yMap.geoObjects.add(placemark);
      placemarksMap[item.id] = placemark;
    });

    // Если есть метки и нет геопозиции пользователя, подстраиваем зум по всем маркерам
    if (filtered.length > 0 && !userCoords) {
      yMap.setBounds(yMap.geoObjects.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 40
      });
    }
  }

  // Фильтрация травмпунктов по категории и поисковой строке
  function getFilteredCenters() {
    return centersData.filter(function (item) {
      if (currentCategory === 'child' && item.type !== 'child') return false;
      if (currentCategory === 'adult' && item.type !== 'adult') return false;
      if (currentCategory === '24h' && !item.is24h) return false;

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

  // Рендер списка карточек
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
        '<h3>Отделения не найдены</h3>' +
        '<p>Попробуйте изменить поисковый запрос или сбросить фильтры.</p>' +
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
        '<p class="trauma-card-phone">📞 <strong>Регистратура:</strong> <a href="tel:' + item.phone.replace(/[^0-9+]/g, '') + '" class="trauma-phone-link">' + item.phone + '</a></p>' +
        '<p class="trauma-card-hours">⏱ <strong>Режим:</strong> ' + item.hours + '</p>' +
        '<p class="trauma-card-desc">' + item.desc + '</p>' +
        '<div class="trauma-card-actions">' +
          '<a href="tel:' + item.phone.replace(/[^0-9+]/g, '') + '" class="action-btn call-action-btn" title="Позвонить в регистратуру: ' + item.phone + '" aria-label="Позвонить в регистратуру">📞 Позвонить в регистратуру</a>' +
          '<a href="' + routeUrl + '" target="_blank" rel="noopener noreferrer" class="action-btn route-action-btn" title="Маршрут в Яндекс.Картах или Навигаторе" aria-label="Маршрут в Яндекс.Картах">🗺️ Маршрут в Яндекс.Картах</a>' +
        '</div>' +
      '</article>';
    });

    container.innerHTML = html;

    // Навешивание кликов на карточки списка
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

  // Фокусировка на маркере при клике на карточку в списке
  function focusCenterOnMap(id) {
    var center = centersData.find(function (c) { return c.id === id; });
    if (!center) return;

    highlightCard(id);

    if (yMap) {
      yMap.panTo([center.lat, center.lng], {
        flying: true,
        duration: 800
      }).then(function () {
        var pm = placemarksMap[id];
        if (pm) {
          pm.balloon.open();
        }
      });
    }

    // Если на мобильном экране открыта вкладка списка, переключаем на карту
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

  // Обработка полученных координат пользователя
  function handleUserLocation(lat, lng) {
    userCoords = { lat: lat, lng: lng };

    var statusEl = document.getElementById('geo-status-badge');
    if (statusEl) {
      statusEl.innerHTML = '<span class="geo-spinner" aria-hidden="true"></span> Определение города и поиск отделений...';
      statusEl.classList.add('geo-active');
    }

    // Добавление метки пользователя на карту
    if (yMap) {
      if (userPlacemark) {
        yMap.geoObjects.remove(userPlacemark);
      }

      userPlacemark = new ymaps.Placemark([userCoords.lat, userCoords.lng], {
        balloonContentHeader: '<strong>Ваше местоположение</strong>',
        balloonContentBody: '<p>Координаты: ' + userCoords.lat.toFixed(4) + ', ' + userCoords.lng.toFixed(4) + '</p>',
        hintContent: 'Вы находитесь здесь'
      }, {
        preset: 'islands#blueCircleDotIconWithCaption',
        iconCaption: 'Вы здесь'
      });

      yMap.geoObjects.add(userPlacemark);
      yMap.setCenter([userCoords.lat, userCoords.lng], 13, { checkZoomRange: true });
    }

    // Обратное геокодирование для получения названия города
    if (typeof ymaps !== 'undefined' && ymaps.geocode) {
      ymaps.geocode([lat, lng]).then(function (res) {
        var firstGeo = res.geoObjects.get(0);
        var cityName = '';
        if (firstGeo) {
          var localities = firstGeo.getLocalities();
          if (localities && localities.length > 0) {
            cityName = localities[0];
          } else {
            var adminAreas = firstGeo.getAdministrativeAreas();
            if (adminAreas && adminAreas.length > 0) {
              cityName = adminAreas[0];
            }
          }
        }
        performTraumaSearch(lat, lng, cityName);
      }).catch(function () {
        performTraumaSearch(lat, lng, '');
      });
    } else {
      performTraumaSearch(lat, lng, '');
    }
  }

  // Поиск травмпунктов через провайдер организаций Яндекса
  function performTraumaSearch(lat, lng, cityName) {
    var statusEl = document.getElementById('geo-status-badge');
    var distFromMoscow = calcDistanceKm(lat, lng, 55.7532, 37.6225);
    var ctrl = initAutoSearchControl();

    if (!ctrl) {
      fallbackToCurated(lat, lng);
      return;
    }

    ctrl.options.set({
      boundedBy: [[lat - 0.35, lng - 0.35], [lat + 0.35, lng + 0.35]],
      useMapBounds: true,
      strictBounds: false
    });

    var searchQuery = (cityName ? cityName + ' ' : '') + 'травмпункт';

    if (statusEl) {
      statusEl.innerHTML = '<span class="geo-spinner" aria-hidden="true"></span> Поиск отделений в ' + (cityName ? 'г. ' + cityName : 'вашем районе') + '...';
    }

    ctrl.search(searchQuery).then(function () {
      var rawResults = ctrl.getResultsArray();

      if (rawResults.length === 0 && cityName) {
        return ctrl.search('травмпункт').then(function () {
          processSearchResults(ctrl.getResultsArray(), lat, lng, cityName, distFromMoscow);
        });
      } else {
        processSearchResults(rawResults, lat, lng, cityName, distFromMoscow);
      }
    }).catch(function (err) {
      console.warn('Ошибка поиска травмпунктов:', err);
      fallbackToCurated(lat, lng);
    });
  }

  // Обработка результатов поиска и рендер
  function processSearchResults(rawResults, lat, lng, cityName, distFromMoscow) {
    var statusEl = document.getElementById('geo-status-badge');
    var foundItems = [];

    rawResults.forEach(function (obj, idx) {
      var coords = obj.geometry.getCoordinates();
      if (!coords || coords.length !== 2) return;

      var name = obj.properties.get('name') || 'Травматологический пункт';
      var desc = obj.properties.get('description') || '';
      var compMeta = obj.properties.get('CompanyMetaData') || {};

      var address = compMeta.address || desc || 'Адрес уточняется';
      var phone = (compMeta.Phones && compMeta.Phones.length > 0 && compMeta.Phones[0].formatted) || '112';
      var hoursText = (compMeta.Hours && compMeta.Hours.text) || 'Режим уточняйте по телефону';
      var is24h = /круглосуточ|24\s*ч|24\/7/i.test(hoursText);
      var isChild = /детск|педиатрич/i.test(name) || /детск/i.test(address);
      var distance = calcDistanceKm(lat, lng, coords[0], coords[1]);

      if (distance > 120) return;

      foundItems.push({
        id: 1000 + idx,
        name: name,
        type: isChild ? 'child' : 'adult',
        is24h: is24h,
        address: address,
        phone: phone,
        metro: '',
        hours: hoursText,
        lat: coords[0],
        lng: coords[1],
        desc: compMeta.url ? ('Официальный сайт: ' + compMeta.url) : 'Городское травматологическое отделение.',
        distance: distance
      });
    });

    if (foundItems.length > 0) {
      if (distFromMoscow > 70) {
        // За пределами Москвы показываем исключительно локальные травмпункты
        centersData = foundItems;
      } else {
        // В Москве/МО объединяем с эталонной базой
        var merged = curatedCenters.slice();
        merged.forEach(function (c) {
          c.distance = calcDistanceKm(lat, lng, c.lat, c.lng);
        });
        foundItems.forEach(function (fItem) {
          var isDup = merged.some(function (m) {
            return calcDistanceKm(fItem.lat, fItem.lng, m.lat, m.lng) < 0.4;
          });
          if (!isDup) {
            merged.push(fItem);
          }
        });
        centersData = merged;
      }

      centersData.sort(function (a, b) { return a.distance - b.distance; });

      if (statusEl) {
        statusEl.innerHTML = '📍 ' + (cityName ? cityName + ': ' : '') + 'найдено ' + centersData.length + ' травмпунктов рядом';
        statusEl.classList.add('geo-active');
      }
    } else {
      if (distFromMoscow > 70) {
        centersData = [];
        if (statusEl) {
          statusEl.innerHTML = '📍 ' + (cityName ? cityName + ': ' : '') + 'травмпункты поблизости не найдены в онлайн-справочнике. При травмах звоните 112.';
          statusEl.classList.add('geo-active');
        }
      } else {
        fallbackToCurated(lat, lng);
      }
    }

    renderList();
    renderMarkers();

    if (yMap && yMap.geoObjects.getLength() > 0) {
      yMap.setBounds(yMap.geoObjects.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 45
      });
    }
  }

  // Резервный возврат к эталонной базе (Москва)
  function fallbackToCurated(lat, lng) {
    var statusEl = document.getElementById('geo-status-badge');
    centersData = curatedCenters.slice();
    if (lat && lng) {
      centersData.forEach(function (item) {
        item.distance = calcDistanceKm(lat, lng, item.lat, item.lng);
      });
      centersData.sort(function (a, b) { return a.distance - b.distance; });
    }
    if (statusEl) {
      statusEl.innerHTML = '📍 Показаны дежурные травматологические центры';
      statusEl.classList.add('geo-active');
    }
    renderList();
    renderMarkers();
  }

  // Запрос геолокации через браузер с жестким тайм-аутом
  function requestGeolocation(isManualRetry) {
    var statusEl = document.getElementById('geo-status-badge');
    if (statusEl) {
      statusEl.innerHTML = '<span class="geo-spinner" aria-hidden="true"></span> Определение ближайших травмпунктов...';
      statusEl.classList.remove('geo-active');
    }

    if (!navigator.geolocation) {
      if (statusEl) statusEl.innerHTML = '📍 Геолокация не поддерживается браузером';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        handleUserLocation(pos.coords.latitude, pos.coords.longitude);
      },
      function (err) {
        console.warn('Геолокация недоступна:', err.message);
        if (statusEl) {
          statusEl.innerHTML = '📍 Геолокация не определена. Нажмите «Определить снова» или введите ваш город в строке поиска.';
        }
        renderList();
        renderMarkers();
      },
      {
        timeout: 7000,
        enableHighAccuracy: isManualRetry || false
      }
    );
  }

  // Настройка фильтров, поиска и кнопок
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
      // 1. Быстрая фильтрация текущего списка
      searchInput.addEventListener('input', function (e) {
        searchQuery = e.target.value.trim();
        renderList();
        renderMarkers();
      });

      // 2. Поиск по городам России по нажатию Enter
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var query = searchInput.value.trim();
          if (query.length >= 3 && typeof ymaps !== 'undefined' && ymaps.geocode) {
            var statusEl = document.getElementById('geo-status-badge');
            if (statusEl) {
              statusEl.innerHTML = '<span class="geo-spinner" aria-hidden="true"></span> Поиск травмпунктов в «' + query + '»...';
              statusEl.classList.add('geo-active');
            }

            ymaps.geocode(query, { results: 1 }).then(function (res) {
              var firstGeo = res.geoObjects.get(0);
              if (firstGeo) {
                var coords = firstGeo.geometry.getCoordinates();
                var localities = firstGeo.getLocalities();
                var city = (localities && localities.length > 0) ? localities[0] : query;
                if (yMap) {
                  yMap.setCenter(coords, 12, { checkZoomRange: true });
                }
                performTraumaSearch(coords[0], coords[1], city);
              } else {
                if (statusEl) statusEl.innerHTML = '📍 Локация «' + query + '» не найдена';
              }
            }).catch(function (err) {
              console.warn('Ошибка поиска города:', err);
            });
          }
        }
      });
    }

    // Кнопка повторного определения геолокации
    var reGeoBtn = document.getElementById('btn-re-geo');
    if (reGeoBtn) {
      reGeoBtn.addEventListener('click', function () {
        requestGeolocation(true);
      });
    }

    // Переключатель табов на смартфонах (Список / Карта)
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
        if (yMap) {
          setTimeout(function () { yMap.container.fitToViewport(); }, 150);
        }
      });
    }
  }

  // Запуск инициализации при готовности DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initYandexMap);
  } else {
    initYandexMap();
  }
})();
