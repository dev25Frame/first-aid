/**
 * Интерактивная карта травмпунктов • Первая помощь рядом
 * Официальная интеграция Яндекс.Карты JS API v2.1 (Ключ 0898ed33-21d0-4e96-8e43-dc2c5466d146)
 * Полностью динамический поиск: определение положения по API ключу + поиск организаций по Яндекс.Справочнику
 * Соответствует принципам WCAG 2.1, Graceful Degradation и Mobile-First
 */

(function () {
  'use strict';

  var yMap = null;
  var placemarksMap = {};
  var userPlacemark = null;
  var autoSearchControl = null;
  var centersData = []; // 100% динамические данные из API Яндекс.Карт без статических записей
  var userCoords = null; // { lat, lng }
  var currentCategory = 'all';
  var searchQuery = '';

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
          resultsPerPage: 25,
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

        initAutoSearchControl();

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

  // Отрисовка маркеров на карте Яндекса
  function renderMarkers() {
    if (!yMap) return;

    // Очистить существующие метки травмпунктов
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

    // Если есть маркеры и карта создана, оптимизируем видимость
    if (filtered.length > 0) {
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
      var emptyMsg = userCoords
        ? 'В данном районе травмпункты онлайн не найдены. Попробуйте изменить масштаб карты, ввести другой город или позвонить в экстренную службу 112.'
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
      yMap.setCenter([userCoords.lat, userCoords.lng], 13, { checkZoomRange: true });
    }

    // Если город уже известен из ответа геолокации Яндекса
    if (knownCity) {
      performTraumaSearch(lat, lng, knownCity);
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
    var ctrl = initAutoSearchControl();

    if (!ctrl) {
      renderList();
      return;
    }

    // Область поиска в радиусе вокруг пользователя
    ctrl.options.set({
      boundedBy: [[lat - 0.35, lng - 0.35], [lat + 0.35, lng + 0.35]],
      useMapBounds: true,
      strictBounds: false
    });

    var searchQuery = (cityName ? cityName + ' ' : '') + 'травмпункт';

    if (statusEl) {
      statusEl.innerHTML = '<span class="geo-spinner" aria-hidden="true"></span> Поиск травмпунктов в ' + (cityName ? 'г. ' + cityName : 'вашем районе') + '...';
    }

    ctrl.search(searchQuery).then(function () {
      var rawResults = ctrl.getResultsArray();

      if (rawResults.length === 0 && cityName) {
        return ctrl.search('травмпункт').then(function () {
          processSearchResults(ctrl.getResultsArray(), lat, lng, cityName);
        });
      } else {
        processSearchResults(rawResults, lat, lng, cityName);
      }
    }).catch(function (err) {
      console.warn('Ошибка поиска травмпунктов:', err);
      if (statusEl) {
        statusEl.innerHTML = '📍 Не удалось загрузить травмпункты. Попробуйте обновить страницу.';
      }
      renderList();
    });
  }

  // Обработка результатов поиска и рендер (100% динамические данные)
  function processSearchResults(rawResults, lat, lng, cityName) {
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

      // Отсекаем объекты, находящиеся дальше 120 км от пользователя (выбросы)
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
      centersData = foundItems;
      centersData.sort(function (a, b) { return a.distance - b.distance; });

      if (statusEl) {
        statusEl.innerHTML = '📍 ' + (cityName ? cityName + ': ' : '') + 'найдено ' + centersData.length + ' травмпунктов рядом';
        statusEl.classList.add('geo-active');
      }
    } else {
      centersData = [];
      if (statusEl) {
        statusEl.innerHTML = '📍 ' + (cityName ? cityName + ': ' : '') + 'травмпункты поблизости не найдены в онлайн-справочнике. При травмах звоните 112.';
        statusEl.classList.add('geo-active');
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

    // Если ручной повтор — запрашиваем через браузерный GPS для максимальной точности,
    // иначе используем 'auto' (быстрое определение по IP/провайдеру API без блокирующих окон)
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
        // Повторяем с провайдером 'auto'
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
