q/**
 * Интерактивная карта экстренной помощи • Первая помощь рядом
 * Официальная интеграция Яндекс.Карты JS API v2.1 (Ключ 0898ed33-21d0-4e96-8e43-dc2c5466d146)
 * Полностью динамический поиск: определение положения по API ключу + поиск травмпунктов и больниц СМП
 * Поддержка выбора радиуса (25-50-75-100 км) и фильтра по больницам скорой помощи
 * Соответствует принципам WCAG 2.1, Graceful Degradation и Mobile-First
 */

(function () {
  'use strict';

  var yMap = null;
  var placemarksMap = {};
  var userPlacemark = null;
  var radiusCircle = null;
  var traumaSearchControl = null;
  var hospitalSearchControl = null;

  var centersData = []; // 100% динамические данные из API Яндекс.Карт
  var userCoords = null; // { lat, lng }
  var currentCity = '';
  var currentCategory = 'all';
  var searchQuery = '';
  var currentRadius = 50; // По умолчанию 50 км

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
  function getYmapsPreset(item) {
    if (item.facilityType === 'hospital') {
      return item.type === 'child' ? 'islands#darkBlueMedicalIcon' : 'islands#violetMedicalIcon';
    }
    // Травмпункты
    if (item.type === 'child') {
      return 'islands#darkGreenMedicalIcon';
    }
    return item.is24h ? 'islands#redMedicalIcon' : 'islands#orangeMedicalIcon';
  }

  // Инициализация поисковых контроллеров по организациям (Яндекс.Справочник)
  function initSearchControls() {
    if (!yMap) return;

    if (!traumaSearchControl) {
      try {
        traumaSearchControl = new ymaps.control.SearchControl({
          options: {
            provider: 'yandex#search',
            noPlacemark: true,
            noCentering: true,
            noPopup: true,
            resultsPerPage: 30,
            useMapBounds: true,
            float: 'none',
            position: { top: '-9999px', left: '-9999px' }
          }
        });
        yMap.controls.add(traumaSearchControl);
      } catch (e) {
        console.warn('Не удалось инициализировать traumaSearchControl:', e);
      }
    }

    if (!hospitalSearchControl) {
      try {
        hospitalSearchControl = new ymaps.control.SearchControl({
          options: {
            provider: 'yandex#search',
            noPlacemark: true,
            noCentering: true,
            noPopup: true,
            resultsPerPage: 30,
            useMapBounds: true,
            float: 'none',
            position: { top: '-9999px', left: '-9999px' }
          }
        });
        yMap.controls.add(hospitalSearchControl);
      } catch (e) {
        console.warn('Не удалось инициализировать hospitalSearchControl:', e);
      }
    }
  }

  // Инициализация карты Яндекс
  function initYandexMap() {
    var mapContainer = document.getElementById('trauma-map');
    if (!mapContainer) return;

    if (typeof ymaps === 'undefined') {
      console.warn('API Яндекс Карт недоступно. Работает автономный режим.');
      var fallbackAlert = document.getElementById('map-fallback-alert');
      if (fallbackAlert) fallbackAlert.style.display = 'block';
      renderList();
      setupControls();
      return;
    }

    ymaps.ready(function () {
      var defaultCenter = [55.753215, 37.622504]; // Начальный центр до ответа геолокации

      try {
        yMap = new ymaps.Map('trauma-map', {
          center: defaultCenter,
          zoom: 11,
          controls: ['zoomControl', 'geolocationControl', 'typeSelector', 'fullscreenControl']
        }, {
          searchControlProvider: 'yandex#search'
        });

        initSearchControls();

        // Слушатель клика на стандартную кнопку геолокации в контролах Яндекса
        var geoControl = yMap.controls.get('geolocationControl');
        if (geoControl) {
          geoControl.events.add('locationchange', function (e) {
            var position = e.get('geoObjects').get(0);
            if (position) {
              var coords = position.geometry.getCoordinates();
              handleUserLocation(coords[0], coords[1], '');
            }
          });
        }

        renderList();
        setupControls();

        // Запрашиваем геолокацию пользователя через API Яндекса
        requestYandexGeolocation(false);

      } catch (e) {
        console.error('Ошибка инициализации Яндекс Карт:', e);
        var fallbackAlert = document.getElementById('map-fallback-alert');
        if (fallbackAlert) fallbackAlert.style.display = 'block';
        renderList();
        setupControls();
      }
    });
  }

  // Обновление круга радиуса на карте
  function updateRadiusCircle() {
    if (!yMap || !userCoords) return;

    if (radiusCircle) {
      yMap.geoObjects.remove(radiusCircle);
    }

    radiusCircle = new ymaps.Circle([[userCoords.lat, userCoords.lng], currentRadius * 1000], {
      hintContent: 'Радиус поиска: ' + currentRadius + ' км'
    }, {
      fillColor: 'rgba(71, 118, 133, 0.08)',
      strokeColor: 'rgba(71, 118, 133, 0.5)',
      strokeWidth: 2,
      strokeStyle: 'shortdash'
    });

    yMap.geoObjects.add(radiusCircle);
  }

  // Отрисовка маркеров на карте Яндекса
  function renderMarkers() {
    if (!yMap) return;

    // Очистить существующие метки
    yMap.geoObjects.removeAll();
    placemarksMap = {};

    // Восстанавливаем круг радиуса и метку пользователя
    if (radiusCircle) {
      yMap.geoObjects.add(radiusCircle);
    }
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

      var typeTitle = item.facilityType === 'hospital'
        ? (item.type === 'child' ? '👶 Детская больница СМП' : '🏥 Больница скорой помощи')
        : (item.type === 'child' ? '👶 Детский травмпункт' : (item.is24h ? '🌙 Травмпункт 24/7' : '🩹 Взрослый травмпункт'));

      var balloonHtml = '<div class="ymaps-balloon-card">' +
        '<h4>' + item.name + '</h4>' +
        '<p style="color:var(--faded_green,#2e7d32);font-weight:700;">' + typeTitle + '</p>' +
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
        preset: getYmapsPreset(item),
        balloonMaxWidth: 300
      });

      placemark.events.add('click', function () {
        highlightCard(item.id);
      });

      yMap.geoObjects.add(placemark);
      placemarksMap[item.id] = placemark;
    });

    // Если есть объекты, подстраиваем зум карты
    if (radiusCircle) {
      yMap.setBounds(radiusCircle.geometry.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 35
      });
    } else if (filtered.length > 0) {
      yMap.setBounds(yMap.geoObjects.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 40
      });
    }
  }

  // Фильтрация отделений по категории, радиусу и поисковой строке
  function getFilteredCenters() {
    return centersData.filter(function (item) {
      // 1. Фильтр по радиусу (25, 50, 75, 100 км)
      if (item.distance !== undefined && item.distance > currentRadius) {
        return false;
      }

      // 2. Фильтр по категориям
      if (currentCategory === 'trauma' && item.facilityType !== 'trauma') return false;
      if (currentCategory === 'hospital' && item.facilityType !== 'hospital') return false;
      if (currentCategory === 'child' && item.type !== 'child') return false;
      if (currentCategory === 'adult' && item.type !== 'adult') return false;
      if (currentCategory === '24h' && !item.is24h) return false;

      // 3. Поиск по строке
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
      var emptyMsg = userCoords
        ? 'В радиусе ' + currentRadius + ' км отделения не найдены. Попробуйте увеличить радиус поиска на слайдере или позвоните в экстренную службу 112.'
        : 'Идёт определение вашего местоположения через API Яндекс.Карт...';
      var emptyIcon = userCoords ? '🔍' : '⏳';

      container.innerHTML = '<div class="no-results-card">' +
        '<div class="no-results-icon">' + emptyIcon + '</div>' +
        '<h3>' + (userCoords ? 'Отделения не найдены' : 'Определение координат') + '</h3>' +
        '<p>' + emptyMsg + '</p>' +
      '</div>';
      return;
    }

    var html = '';
    filtered.forEach(function (item) {
      var badgeClass = '';
      var badgeLabel = '';

      if (item.facilityType === 'hospital') {
        badgeClass = 'badge-hospital';
        badgeLabel = item.type === 'child' ? '👶 Детская больница СМП' : '🏥 Больница скорой помощи';
      } else {
        if (item.type === 'child') {
          badgeClass = 'badge-child';
          badgeLabel = '👶 Детский травмпункт';
        } else if (item.is24h) {
          badgeClass = 'badge-24h';
          badgeLabel = '🌙 Круглосуточно (24/7)';
        } else {
          badgeClass = 'badge-trauma';
          badgeLabel = '🩹 Взрослый травмпункт';
        }
      }

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
  function handleUserLocation(lat, lng, knownCity) {
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
      yMap.setCenter([userCoords.lat, userCoords.lng], 11, { checkZoomRange: true });
    }

    updateRadiusCircle();

    // Если город уже известен из ответа геолокации Яндекса
    if (knownCity) {
      currentCity = knownCity;
      performMedicalSearch(lat, lng, knownCity);
      return;
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
        currentCity = cityName;
        performMedicalSearch(lat, lng, cityName);
      }).catch(function () {
        performMedicalSearch(lat, lng, '');
      });
    } else {
      performMedicalSearch(lat, lng, '');
    }
  }

  // Поиск травмпунктов и больниц СМП через провайдер организаций Яндекса
  function performMedicalSearch(lat, lng, cityName) {
    var statusEl = document.getElementById('geo-status-badge');
    initSearchControls();

    if (!traumaSearchControl || !hospitalSearchControl) {
      renderList();
      return;
    }

    // Область поиска до 100 км вокруг пользователя
    var boundBox = [[lat - 0.9, lng - 0.9], [lat + 0.9, lng + 0.9]];
    traumaSearchControl.options.set({
      boundedBy: boundBox,
      useMapBounds: true,
      strictBounds: false
    });
    hospitalSearchControl.options.set({
      boundedBy: boundBox,
      useMapBounds: true,
      strictBounds: false
    });

    var qTrauma = (cityName ? cityName + ' ' : '') + 'травмпункт';
    var qHospital = (cityName ? cityName + ' ' : '') + 'больница';

    if (statusEl) {
      statusEl.innerHTML = '<span class="geo-spinner" aria-hidden="true"></span> Поиск травмпунктов и больниц скорой помощи в ' + (cityName ? 'г. ' + cityName : 'вашем районе') + '...';
    }

    // Параллельный запрос к обоим профилям экстренных отделений
    var pTrauma = traumaSearchControl.search(qTrauma).then(function () {
      var res = traumaSearchControl.getResultsArray();
      if (res.length === 0 && cityName) {
        return traumaSearchControl.search('травмпункт').then(function () {
          return traumaSearchControl.getResultsArray();
        });
      }
      return res;
    }).catch(function () { return []; });

    var pHospital = hospitalSearchControl.search(qHospital).then(function () {
      var res = hospitalSearchControl.getResultsArray();
      if (res.length === 0 && cityName) {
        return hospitalSearchControl.search('больница скорой медицинской помощи').then(function () {
          return hospitalSearchControl.getResultsArray();
        });
      }
      return res;
    }).catch(function () { return []; });

    Promise.all([pTrauma, pHospital]).then(function (resultsPair) {
      processAllMedicalResults(resultsPair[0] || [], resultsPair[1] || [], lat, lng, cityName);
    }).catch(function (err) {
      console.warn('Ошибка загрузки отделений:', err);
      if (statusEl) {
        statusEl.innerHTML = '📍 Не удалось загрузить отделения. Попробуйте обновить страницу.';
      }
      renderList();
    });
  }

  // Обработка результатов поиска и рендер (травмпункты + больницы СМП)
  function processAllMedicalResults(rawTrauma, rawHospital, lat, lng, cityName) {
    var statusEl = document.getElementById('geo-status-badge');
    var items = [];
    var idCounter = 1000;

    // 1. Обрабатываем травматологические пункты
    rawTrauma.forEach(function (obj) {
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

      if (distance > 110) return;

      items.push({
        id: ++idCounter,
        facilityType: 'trauma',
        name: name,
        type: isChild ? 'child' : 'adult',
        is24h: is24h,
        address: address,
        phone: phone,
        metro: '',
        hours: hoursText,
        lat: coords[0],
        lng: coords[1],
        desc: compMeta.url ? ('Официальный сайт: ' + compMeta.url) : 'Городское травматологическое отделение экстренной помощи.',
        distance: distance
      });
    });

    // 2. Обрабатываем больницы скорой медицинской помощи (БСМП/дежурные стационары)
    rawHospital.forEach(function (obj) {
      var coords = obj.geometry.getCoordinates();
      if (!coords || coords.length !== 2) return;

      var name = obj.properties.get('name') || 'Больница скорой медицинской помощи';
      var desc = obj.properties.get('description') || '';
      var compMeta = obj.properties.get('CompanyMetaData') || {};

      // Исключаем дубликаты, если клиника уже есть в списке (< 250м)
      var isDup = items.some(function (existing) {
        return calcDistanceKm(coords[0], coords[1], existing.lat, existing.lng) < 0.25;
      });
      if (isDup) return;

      var address = compMeta.address || desc || 'Адрес уточняется';
      var phone = (compMeta.Phones && compMeta.Phones.length > 0 && compMeta.Phones[0].formatted) || '112';
      var hoursText = (compMeta.Hours && compMeta.Hours.text) || 'Приёмное отделение: круглосуточно (24/7)';
      var is24h = /круглосуточ|24\s*ч|24\/7/i.test(hoursText) || true;
      var isChild = /детск|педиатрич/i.test(name) || /детск/i.test(address);
      var distance = calcDistanceKm(lat, lng, coords[0], coords[1]);

      if (distance > 110) return;

      items.push({
        id: ++idCounter,
        facilityType: 'hospital',
        name: name,
        type: isChild ? 'child' : 'adult',
        is24h: is24h,
        address: address,
        phone: phone,
        metro: '',
        hours: hoursText,
        lat: coords[0],
        lng: coords[1],
        desc: compMeta.url ? ('Официальный сайт: ' + compMeta.url) : 'Клиническая больница скорой помощи. Экстренный приёмный покой.',
        distance: distance
      });
    });

    centersData = items;
    centersData.sort(function (a, b) { return a.distance - b.distance; });

    var visibleFiltered = getFilteredCenters();

    if (centersData.length > 0) {
      if (statusEl) {
        statusEl.innerHTML = '📍 ' + (cityName ? cityName + ': ' : '') + 'найдено учреждений: ' + visibleFiltered.length + ' (в радиусе ' + currentRadius + ' км)';
        statusEl.classList.add('geo-active');
      }
    } else {
      if (statusEl) {
        statusEl.innerHTML = '📍 ' + (cityName ? cityName + ': ' : '') + 'отделения поблизости не найдены в онлайн-справочнике. При экстренных случаях звоните 112.';
        statusEl.classList.add('geo-active');
      }
    }

    renderList();
    renderMarkers();
  }

  // Определение местоположения через API Яндекс.Карт (по API-ключу / GeoIP / браузерному GPS)
  function requestYandexGeolocation(isManualRetry) {
    var statusEl = document.getElementById('geo-status-badge');
    if (statusEl) {
      statusEl.innerHTML = '<span class="geo-spinner" aria-hidden="true"></span> Определение местоположения через API...';
      statusEl.classList.remove('geo-active');
    }

    if (typeof ymaps === 'undefined' || !ymaps.geolocation) {
      fallbackBrowserGeolocation();
      return;
    }

    // При ручном повторе запрашиваем через браузерный GPS для максимальной точности
    var providerType = isManualRetry ? 'browser' : 'auto';

    ymaps.geolocation.get({
      provider: providerType,
      autoReverseGeocode: true,
      mapStateAutoApply: true,
      timeout: 8000
    }).then(function (result) {
      var firstGeo = result.geoObjects.get(0);
      if (!firstGeo) throw new Error('Геопозиция не определена');

      var coords = firstGeo.geometry.getCoordinates();
      var localities = firstGeo.getLocalities();
      var cityName = (localities && localities.length > 0) ? localities[0] : '';
      if (!cityName) {
        var adminAreas = firstGeo.getAdministrativeAreas();
        if (adminAreas && adminAreas.length > 0) cityName = adminAreas[0];
      }

      handleUserLocation(coords[0], coords[1], cityName);
    }).catch(function (err) {
      console.warn('Ошибка первичной геолокации Яндекс API, пробуем альтернативный способ:', err);
      if (isManualRetry && providerType === 'browser') {
        ymaps.geolocation.get({ provider: 'auto', autoReverseGeocode: true }).then(function (res) {
          var geo = res.geoObjects.get(0);
          if (geo) {
            var coords = geo.geometry.getCoordinates();
            var localities = geo.getLocalities();
            var city = (localities && localities.length > 0) ? localities[0] : '';
            handleUserLocation(coords[0], coords[1], city);
            return;
          }
          fallbackBrowserGeolocation();
        }).catch(function () {
          fallbackBrowserGeolocation();
        });
      } else {
        fallbackBrowserGeolocation();
      }
    });
  }

  // Резервный опрос через нативный navigator.geolocation
  function fallbackBrowserGeolocation() {
    var statusEl = document.getElementById('geo-status-badge');
    if (!navigator.geolocation) {
      if (statusEl) statusEl.innerHTML = '📍 Геолокация не поддерживается. Введите ваш город в строке поиска.';
      renderList();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        handleUserLocation(pos.coords.latitude, pos.coords.longitude, '');
      },
      function (err) {
        console.warn('Нативная геолокация недоступна:', err.message);
        if (statusEl) {
          statusEl.innerHTML = '📍 Местоположение не определено. Нажмите «Определить снова» или введите ваш город в строке поиска.';
        }
        renderList();
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  }

  // Настройка фильтров, поиска, слайдера радиуса и кнопок
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

    // Слайдер радиуса поиска (25, 50, 75, 100 км)
    var radiusSlider = document.getElementById('radius-slider');
    var radiusValBadge = document.getElementById('radius-val-badge');
    var radiusTicks = document.querySelectorAll('.radius-ticks .tick');

    function setRadius(newRadius) {
      currentRadius = parseInt(newRadius, 10);
      if (radiusSlider) radiusSlider.value = currentRadius;
      if (radiusValBadge) radiusValBadge.textContent = currentRadius + ' км';

      // Обновляем активную метку
      radiusTicks.forEach(function (tick) {
        var val = parseInt(tick.getAttribute('data-val'), 10);
        if (val === currentRadius) {
          tick.classList.add('active');
        } else {
          tick.classList.remove('active');
        }
      });

      // Обновляем круг на карте
      updateRadiusCircle();

      // Обновляем статус
      var statusEl = document.getElementById('geo-status-badge');
      if (statusEl && userCoords) {
        var visible = getFilteredCenters();
        statusEl.innerHTML = '📍 ' + (currentCity ? currentCity + ': ' : '') + 'найдено учреждений: ' + visible.length + ' (в радиусе ' + currentRadius + ' км)';
      }

      renderList();
      renderMarkers();
    }

    if (radiusSlider) {
      radiusSlider.addEventListener('input', function (e) {
        setRadius(e.target.value);
      });
    }

    radiusTicks.forEach(function (tick) {
      tick.addEventListener('click', function () {
        var val = tick.getAttribute('data-val');
        setRadius(val);
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
              statusEl.innerHTML = '<span class="geo-spinner" aria-hidden="true"></span> Поиск отделений в «' + query + '»...';
              statusEl.classList.add('geo-active');
            }

            ymaps.geocode(query, { results: 1 }).then(function (res) {
              var firstGeo = res.geoObjects.get(0);
              if (firstGeo) {
                var coords = firstGeo.geometry.getCoordinates();
                var localities = firstGeo.getLocalities();
                var city = (localities && localities.length > 0) ? localities[0] : query;
                if (yMap) {
                  yMap.setCenter(coords, 11, { checkZoomRange: true });
                }
                userCoords = { lat: coords[0], lng: coords[1] };
                currentCity = city;
                updateRadiusCircle();
                performMedicalSearch(coords[0], coords[1], city);
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
        requestYandexGeolocation(true);
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
