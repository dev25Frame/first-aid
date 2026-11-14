/**
 * Интерактивная карта травмпунктов и больниц • Первая помощь рядом
 * Официальная интеграция Яндекс.Карты JS API v2.1 (Ключ 0898ed33-21d0-4e96-8e43-dc2c5466d146)
 * Простая и быстрая карта с фильтрами «Травмпункты» и «Больницы»
 * Полностью динамический поиск по API Яндекс.Карт
 * Соответствует принципам WCAG 2.1, Graceful Degradation и Mobile-First
 */

(function () {
  'use strict';

  var yMap = null;
  var placemarksMap = {};
  var userPlacemark = null;
  var radiusCircle = null;
  var medicalCollection = null;
  var traumaSearchControl = null;
  var hospitalSearchControl = null;

  var centersData = []; // Динамические данные из API Яндекс.Карт
  var userCoords = null; // { lat, lng }
  var currentCity = '';
  var currentCategory = 'all'; // 'all', 'trauma', 'hospital'
  var currentRadius = 50; // По умолчанию 50 км
  var idCounter = 1000; // Глобальный счетчик ID для уникальности между вызовами

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

  // Название категории для отображения в статусе и уведомлениях
  function getCategoryTitle(cat) {
    switch (cat) {
      case 'trauma': return 'Травмпункты';
      case 'hospital': return 'Больницы';
      case '24h': return 'Круглосуточно (24/7)';
      case 'child': return 'Детские отделения';
      case 'eye': return 'Травмы глаз';
      case 'burn': return 'Ожоговые центры';
      default: return 'Все отделения';
    }
  }

  // Получение пресета иконки Яндекс.Карт в зависимости от типа учреждения
  function getYmapsPreset(item) {
    if (/глаз|офтальмол/i.test(item.name)) {
      return 'islands#violetMedicalIcon';
    }
    if (/ожог|комбустиол/i.test(item.name)) {
      return 'islands#darkOrangeMedicalIcon';
    }
    if (item.facilityType === 'hospital') {
      return item.type === 'child' ? 'islands#darkBlueMedicalIcon' : 'islands#blueMedicalIcon';
    }
    // Травмпункты
    if (item.type === 'child') {
      return 'islands#darkGreenMedicalIcon';
    }
    return item.is24h ? 'islands#redMedicalIcon' : 'islands#orangeMedicalIcon';
  }

  // Инициализация поисковых контроллеров по организациям
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
            resultsPerPage: 50,
            useMapBounds: false, // ВАЖНО: false, чтобы поиск не зависел от размера и вьюпорта контейнера карты
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
            resultsPerPage: 50,
            useMapBounds: false, // ВАЖНО: false, чтобы поиск не зависел от размера и вьюпорта контейнера карты
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
          zoom: 12,
          controls: ['zoomControl', 'geolocationControl', 'typeSelector', 'fullscreenControl']
        }, {
          searchControlProvider: 'yandex#search'
        });

        medicalCollection = new ymaps.GeoObjectCollection();
        yMap.geoObjects.add(medicalCollection);

        initSearchControls();

        // Слушатель стандартной кнопки геолокации в контролах карты
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
      radiusCircle.geometry.setCoordinates([userCoords.lat, userCoords.lng]);
      radiusCircle.geometry.setRadius(currentRadius * 1000);
      radiusCircle.properties.set('hintContent', 'Радиус поиска: ' + currentRadius + ' км');
    } else {
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
  }

  // Отрисовка маркеров на карте Яндекса
  function renderMarkers() {
    if (!yMap || !medicalCollection) return;

    // Очистить только существующие метки учреждений, не удаляя круг радиуса и позицию пользователя
    medicalCollection.removeAll();
    placemarksMap = {};

    var filtered = getFilteredCenters();

    filtered.forEach(function (item) {
      var routeUrl = 'https://yandex.ru/maps/?rtext=' +
        (userCoords ? userCoords.lat + ',' + userCoords.lng : '') +
        '~' + item.lat + ',' + item.lng + '&rtt=auto';

      var distText = item.distance !== undefined
        ? '<p><strong>📍 ' + item.distance.toFixed(1) + ' км от вас</strong></p>'
        : '';

      var typeTitle = item.facilityType === 'hospital'
        ? (item.type === 'child' ? '👶 Детская больница' : '🏥 Больница')
        : (item.type === 'child' ? '👶 Детский травмпункт' : '🩹 Травмпункт');

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

      medicalCollection.add(placemark);
      placemarksMap[item.id] = placemark;
    });

    if (radiusCircle) {
      yMap.setBounds(radiusCircle.geometry.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 35
      });
    } else if (filtered.length > 0 && medicalCollection.getBounds()) {
      yMap.setBounds(medicalCollection.getBounds(), {
        checkZoomRange: true,
        zoomMargin: 40
      });
    }
  }

  // Фильтрация отделений по категории и радиусу
  function getFilteredCenters() {
    return centersData.filter(function (item) {
      // 1. Фильтр по радиусу (25, 50, 75, 100 км)
      if (item.distance !== undefined && item.distance > currentRadius) {
        return false;
      }

      // 2. Фильтр по категориям
      if (currentCategory === 'trauma') {
        if (!item.isTrauma && item.facilityType !== 'trauma') return false;
      } else if (currentCategory === 'hospital') {
        if (!item.isHospital && item.facilityType !== 'hospital') return false;
      } else if (currentCategory === '24h') {
        if (!item.is24h) return false;
      } else if (currentCategory === 'child') {
        var isChild = item.type === 'child' || /детск|педиатрич/i.test(item.name + ' ' + item.desc);
        if (!isChild) return false;
      } else if (currentCategory === 'eye') {
        var isEye = /глаз|офтальмол|микрохирурги/i.test(item.name + ' ' + item.desc);
        if (!isEye) return false;
      } else if (currentCategory === 'burn') {
        var isBurn = /ожог|комбустиол/i.test(item.name + ' ' + item.desc);
        if (!isBurn) return false;
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
      var catTitle = getCategoryTitle(currentCategory);
      var emptyMsg = userCoords
        ? 'Отделения в категории «' + catTitle + '» в радиусе ' + currentRadius + ' км не найдены. Попробуйте увеличить радиус поиска (до 75–100 км) или выбрать «Все категории».'
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
      var badgeClass = item.facilityType === 'hospital' ? 'badge-hospital' : 'badge-trauma';
      var badgeLabel = item.facilityType === 'hospital'
        ? (item.type === 'child' ? '👶 Детская больница' : '🏥 Больница')
        : (item.type === 'child' ? '👶 Детский травмпункт' : (item.is24h ? '🌙 Травмпункт (24/7)' : '🩹 Травмпункт'));

      if (/глаз|офтальмол/i.test(item.name)) {
        badgeLabel = '👁️ Глазная травма';
      } else if (/ожог|комбустиол/i.test(item.name)) {
        badgeLabel = '🔥 Ожоговый центр';
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
    if (window.innerWidth <= 680 && mapTabBtn) {
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

    // Добавление / обновление метки пользователя на карте
    if (yMap) {
      if (!userPlacemark) {
        userPlacemark = new ymaps.Placemark([userCoords.lat, userCoords.lng], {
          balloonContentHeader: '<strong>Ваше местоположение</strong>',
          balloonContentBody: '<p>Координаты: ' + userCoords.lat.toFixed(4) + ', ' + userCoords.lng.toFixed(4) + '</p>',
          hintContent: 'Вы находитесь здесь'
        }, {
          preset: 'islands#blueCircleDotIconWithCaption',
          iconCaption: 'Вы здесь'
        });
        yMap.geoObjects.add(userPlacemark);
      } else {
        userPlacemark.geometry.setCoordinates([userCoords.lat, userCoords.lng]);
        userPlacemark.properties.set('balloonContentBody', '<p>Координаты: ' + userCoords.lat.toFixed(4) + ', ' + userCoords.lng.toFixed(4) + '</p>');
      }

      yMap.setCenter([userCoords.lat, userCoords.lng], 11, { checkZoomRange: true });
    }

    updateRadiusCircle();

    // Если город уже известен
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

  // Очистка названия населенного пункта от административных приставок
  function cleanCityTitle(rawCity) {
    if (!rawCity || typeof rawCity !== 'string') return '';
    return rawCity
      .replace(/^(городской округ|муниципальный округ|городское поселение|сельское поселение|город|поселок|село|пгт|деревня)\s+/i, '')
      .replace(/\s+(район|область|край|республика|автономный округ)$/i, '')
      .replace(/[0-9]/g, '')
      .trim();
  }

  // Выполнение одного поискового запроса организаций
  function searchSingleQuery(queryText, boundBox) {
    return new Promise(function (resolve) {
      // 1. Прямой асинхронный поиск через ymaps.geocode с provider: 'yandex#search'
      if (typeof ymaps !== 'undefined' && ymaps.geocode) {
        ymaps.geocode(queryText, {
          provider: 'yandex#search',
          boundedBy: boundBox,
          strictBounds: false,
          results: 50
        }).then(function (res) {
          var list = [];
          if (res && res.geoObjects) {
            res.geoObjects.each(function (obj) {
              list.push(obj);
            });
          }
          if (list.length > 0) {
            resolve(list);
            return;
          }
          // Резервный поиск через SearchControl
          searchViaControl(queryText, boundBox).then(resolve);
        }).catch(function (err) {
          console.warn('ymaps.geocode error for "' + queryText + '":', err);
          searchViaControl(queryText, boundBox).then(resolve);
        });
      } else {
        searchViaControl(queryText, boundBox).then(resolve);
      }
    });
  }

  // Резервный поиск через поисковый контроллер Яндекса
  function searchViaControl(queryText, boundBox) {
    return new Promise(function (resolve) {
      if (!yMap) {
        resolve([]);
        return;
      }
      initSearchControls();
      var ctrl = (queryText.indexOf('травм') !== -1) ? traumaSearchControl : hospitalSearchControl;
      if (!ctrl) {
        resolve([]);
        return;
      }
      try {
        ctrl.options.set({
          boundedBy: boundBox,
          useMapBounds: false, // ВАЖНО: false, чтобы поиск шел строго по координатам boundBox
          strictBounds: false,
          resultsPerPage: 50
        });
        ctrl.search(queryText).then(function () {
          var arr = ctrl.getResultsArray() || [];
          resolve(arr);
        }).catch(function (err) {
          console.warn('SearchControl error for "' + queryText + '":', err);
          resolve([]);
        });
      } catch (e) {
        resolve([]);
      }
    });
  }

  // Целевой дозапрос специализированных категорий (офтальмология, ожоги), если их нет в исходной выборке
  function fetchSpecializedCategory(category) {
    if (!userCoords) return;
    var statusEl = document.getElementById('geo-status-badge');
    var queryText = category === 'eye' ? 'глазная травматология' : 'ожоговый центр';
    var label = category === 'eye' ? 'офтальмологических отделений' : 'ожоговых центров';

    if (statusEl) {
      statusEl.innerHTML = '<span class="geo-spinner" aria-hidden="true"></span> Поиск ' + label + '...';
      statusEl.classList.remove('geo-active');
    }

    var dLat = 105 / 111.32;
    var cosLat = Math.cos(userCoords.lat * Math.PI / 180);
    var dLng = 105 / (111.32 * Math.max(Math.abs(cosLat), 0.25));
    var boundBox = [
      [userCoords.lat - dLat, userCoords.lng - dLng],
      [userCoords.lat + dLat, userCoords.lng + dLng]
    ];

    searchSingleQuery(queryText, boundBox).then(function (results) {
      if (results && results.length > 0) {
        var group = [{ categoryHint: category === 'eye' ? 'trauma' : 'hospital', list: results }];
        processAllMedicalResults(group, userCoords.lat, userCoords.lng, currentCity, true);
      } else {
        updateStatusCount();
        renderList();
        renderMarkers();
      }
    }).catch(function () {
      updateStatusCount();
      renderList();
      renderMarkers();
    });
  }

  // Поиск травмпунктов и больниц через провайдер организаций Яндекса
  function performMedicalSearch(lat, lng, cityName) {
    var statusEl = document.getElementById('geo-status-badge');
    var displayCity = cleanCityTitle(cityName) || cityName || '';

    if (statusEl) {
      statusEl.innerHTML = '<span class="geo-spinner" aria-hidden="true"></span> Поиск травмпунктов и больниц' + (displayCity ? ' в районе г. ' + displayCity : ' в радиусе 100 км') + '...';
      statusEl.classList.remove('geo-active');
    }

    // Правильный расчет географического прямоугольника поиска до 105 км вокруг координат
    // 1 градус широты ≈ 111.32 км; 1 градус долготы ≈ 111.32 * cos(lat)
    var dLat = 105 / 111.32; // ~0.94 градуса широты
    var cosLat = Math.cos(lat * Math.PI / 180);
    var dLng = 105 / (111.32 * Math.max(Math.abs(cosLat), 0.25)); // от 1.3 до 1.8 градуса долготы
    var boundBox = [
      [lat - dLat, lng - dLng],
      [lat + dLat, lng + dLng]
    ];

    // Формируем поисковые запросы по организациям
    var queryList = [
      { text: 'больница', categoryHint: 'hospital' },
      { text: 'травмпункт', categoryHint: 'trauma' },
      { text: 'больница скорой медицинской помощи', categoryHint: 'hospital' },
      { text: 'травматологическое отделение', categoryHint: 'trauma' }
    ];

    var cleanCity = cleanCityTitle(cityName);
    if (cleanCity && cleanCity.length >= 3) {
      queryList.push({ text: cleanCity + ' больница', categoryHint: 'hospital' });
      queryList.push({ text: cleanCity + ' травмпункт', categoryHint: 'trauma' });
    }

    // Запускаем параллельные запросы по всем профилям
    var promises = queryList.map(function (item) {
      return searchSingleQuery(item.text, boundBox).then(function (res) {
        return { categoryHint: item.categoryHint, list: res || [] };
      });
    });

    Promise.all(promises).then(function (groupedResults) {
      processAllMedicalResults(groupedResults, lat, lng, displayCity, false);
    }).catch(function (err) {
      console.warn('Ошибка выполнения медицинского поиска:', err);
      if (statusEl) {
        statusEl.innerHTML = '📍 Не удалось загрузить отделения. Попробуйте обновить страницу.';
        statusEl.classList.add('geo-active');
      }
      renderList();
    });
  }

  // Обработка результатов поиска и рендер
  function processAllMedicalResults(groupedResults, lat, lng, displayCity, isAppend) {
    var items = isAppend ? centersData.slice() : [];

    groupedResults.forEach(function (group) {
      var categoryHint = group.categoryHint;
      group.list.forEach(function (obj) {
        var coords = obj.geometry && obj.geometry.getCoordinates && obj.geometry.getCoordinates();
        if (!coords || coords.length !== 2) return;

        var name = obj.properties.get('name') || (categoryHint === 'trauma' ? 'Травматологический пункт' : 'Больница');
        var desc = obj.properties.get('description') || '';
        var compMeta = obj.properties.get('CompanyMetaData') || {};

        var address = compMeta.address || desc || 'Адрес уточняется';
        var phone = (compMeta.Phones && compMeta.Phones.length > 0 && compMeta.Phones[0].formatted) || '112';
        var hoursText = (compMeta.Hours && compMeta.Hours.text) || 'Круглосуточно (24/7)';
        var is24h = /круглосуточ|24\s*ч|24\/7/i.test(hoursText);
        var isChild = /детск|педиатрич/i.test(name) || /детск/i.test(address);

        var nameLower = (name + ' ' + desc).toLowerCase();
        var isTrauma = /травм|перелом|ушиб|хирург/i.test(nameLower) || (categoryHint === 'trauma');
        var isHospital = /больниц|госпитал|клиник|стационар|смп/i.test(nameLower) || (categoryHint === 'hospital');

        var distance = calcDistanceKm(lat, lng, coords[0], coords[1]);

        // Ограничиваем максимальную дальность выборки 120 км (для уверенного покрытия радиуса 100 км)
        if (distance > 120) return;

        // Дедупликация: не добавляем, если такое учреждение уже есть в радиусе 250 метров или совпадает ID
        var isDup = items.some(function (existing) {
          var distM = calcDistanceKm(coords[0], coords[1], existing.lat, existing.lng) * 1000;
          if (distM < 250) return true;
          if (compMeta.id && existing.companyId && compMeta.id === existing.companyId) return true;
          return false;
        });
        if (isDup) return;

        var facilityType = (categoryHint === 'trauma' || (isTrauma && !isHospital)) ? 'trauma' : 'hospital';

        items.push({
          id: ++idCounter,
          companyId: compMeta.id || '',
          facilityType: facilityType,
          isTrauma: isTrauma,
          isHospital: isHospital,
          name: name,
          type: isChild ? 'child' : 'adult',
          is24h: is24h,
          address: address,
          phone: phone,
          metro: '',
          hours: hoursText,
          lat: coords[0],
          lng: coords[1],
          desc: compMeta.url ? ('Официальный сайт: ' + compMeta.url) : (facilityType === 'hospital' ? 'Городская клиническая больница. Экстренное приёмное отделение.' : 'Городской травматологический пункт.'),
          distance: distance
        });
      });
    });

    centersData = items;
    centersData.sort(function (a, b) { return a.distance - b.distance; });

    updateStatusCount();
    renderList();
    renderMarkers();
  }

  // Определение местоположения через API Яндекс.Карт
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

  // Функция обновления статусной строки
  function updateStatusCount() {
    var statusEl = document.getElementById('geo-status-badge');
    if (statusEl && userCoords) {
      var visible = getFilteredCenters();
      var displayCity = cleanCityTitle(currentCity) || currentCity || '';
      var catTitle = getCategoryTitle(currentCategory);
      if (visible.length > 0) {
        statusEl.innerHTML = '📍 ' + (displayCity ? displayCity + ': ' : '') + 'найдено (' + catTitle + '): ' + visible.length + ' (в радиусе ' + currentRadius + ' км)';
        statusEl.classList.add('geo-active');
      } else {
        statusEl.innerHTML = '📍 ' + (displayCity ? displayCity + ': ' : '') + 'в радиусе ' + currentRadius + ' км отделения («' + catTitle + '») не найдены.';
        statusEl.classList.add('geo-active');
      }
    }
  }

  // Настройка фильтров, выбора категории, радиуса и кнопок
  function setupControls() {
    var categorySelect = document.getElementById('map-category-select');
    var chips = document.querySelectorAll('.map-chips .chip');

    // Обработка смены категории
    function setCategory(cat) {
      currentCategory = cat;

      // Синхронизируем значение выпадающего списка
      if (categorySelect && categorySelect.value !== cat) {
        categorySelect.value = cat;
      }

      // Синхронизируем состояние чипсов быстрого выбора
      chips.forEach(function (c) {
        if (c.getAttribute('data-category') === cat) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });

      // Если выбрана специализированная категория (глазная травма или ожоги) и таких объектов пока нет в выборке
      var filtered = getFilteredCenters();
      if (filtered.length === 0 && (cat === 'eye' || cat === 'burn') && userCoords) {
        fetchSpecializedCategory(cat);
        return;
      }

      updateStatusCount();
      renderList();
      renderMarkers();
    }

    // Слушатель выпадающего списка категорий
    if (categorySelect) {
      categorySelect.addEventListener('change', function (e) {
        setCategory(e.target.value);
      });
    }

    // Слушатели быстрых чипсов
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var cat = chip.getAttribute('data-category');
        setCategory(cat);
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

      updateStatusCount();
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
      function syncMobileTabVisibility() {
        if (window.innerWidth <= 680) {
          if (tabListBtn.classList.contains('active')) {
            mapCol.classList.add('hidden-mobile');
            listCol.classList.remove('hidden-mobile');
          } else {
            listCol.classList.add('hidden-mobile');
            mapCol.classList.remove('hidden-mobile');
          }
        } else {
          listCol.classList.remove('hidden-mobile');
          mapCol.classList.remove('hidden-mobile');
        }
      }

      // Начальное состояние для мобильных экранов
      syncMobileTabVisibility();

      // Автоматическая адаптация при изменении размера экрана
      window.addEventListener('resize', function () {
        syncMobileTabVisibility();
        if (yMap) {
          yMap.container.fitToViewport();
        }
      });

      tabListBtn.addEventListener('click', function () {
        tabListBtn.classList.add('active');
        tabListBtn.setAttribute('aria-selected', 'true');
        tabMapBtn.classList.remove('active');
        tabMapBtn.setAttribute('aria-selected', 'false');
        listCol.classList.remove('hidden-mobile');
        mapCol.classList.add('hidden-mobile');
      });

      tabMapBtn.addEventListener('click', function () {
        tabMapBtn.classList.add('active');
        tabMapBtn.setAttribute('aria-selected', 'true');
        tabListBtn.classList.remove('active');
        tabListBtn.setAttribute('aria-selected', 'false');
        mapCol.classList.remove('hidden-mobile');
        listCol.classList.add('hidden-mobile');
        if (yMap) {
          setTimeout(function () {
            yMap.container.fitToViewport();
            if (radiusCircle) {
              yMap.setBounds(radiusCircle.geometry.getBounds(), { checkZoomRange: true, zoomMargin: 35 });
            }
          }, 150);
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
