const app = document.querySelector('.app'),
      currentImage = document.querySelector('.current-image'),
      preloader = document.querySelector('.image-loader');

let modeState, currentImageId, currentImageLink, webSocket;

const menu = document.querySelector('.menu'),
      menuBtns = document.querySelectorAll('.menu__item'),
      menuDragBtn = document.querySelector('.drag'),
      menuBurgerBtn = document.querySelector('.burger'),
      menuAddNewBtn = document.querySelector('.new'),
      menuCommentsBtn = document.querySelector('.comments'),
      menuDrawBtn = document.querySelector('.draw'),
      menuShareBtn = document.querySelector('.share'),
      menuDrawTools = document.querySelector('.draw-tools'),
      menuShareTools = document.querySelector('.share-tools'),
      menuCommentsTools = document.querySelector('.comments-tools'),
      menuCommentsToolsToggleInputs = document.querySelectorAll('.menu__toggle');

const error = document.querySelector('.error'),
      errorMsg = document.querySelector('.error__message');
      
initMenuDragging();
initBurger();
initPostingMode();

// если есть параметр с айди в ссылке, то загрузить имеющееся изображение, если нет - перейти в режим "Загрузить новое"
window.location.search ? loadExistingImage((window.location.search).split('=')[1]) : modeSwitcher('new');

//--------------------настройка работы меню--------------------
function initBurger() { 
  menuBurgerBtn.addEventListener('click', event => {
    Array.from(menuBtns).forEach(btn => {
      if (btn.classList.contains('mode') || btn.classList.contains('drag') || btn.classList.contains('burger')) {
        btn.style = 'display: inline-block;';
      } else {
        btn.style = 'display: none;';
      };
    });
  });
};

function initMenuDragging() {
  let dragging = false,
      shiftX = 0,
      shiftY = 0;

  menuDragBtn.addEventListener('mousedown', event => {
    dragging = true;
    const menuBounds = menu.getBoundingClientRect();
    shiftX = event.pageX - menuBounds.left - window.pageXOffset;
    shiftY = event.pageY - menuBounds.top - window.pageYOffset;
  });

  document.addEventListener('mousemove', throttle((event) => {
    if (dragging) {
      event.preventDefault();
      const menuBounds = menu.getBoundingClientRect(),
            maxX = window.innerWidth - menu.offsetWidth - 1,
            maxY = window.innerHeight - menu.offsetHeight,
            minX = 0,
            minY = 0;

      let x = event.pageX - shiftX,
          y = event.pageY - shiftY;

      x = Math.min(x, maxX);
      x = Math.max(x, minX);
      y = Math.min(y, maxY);
      y = Math.max(y, minY);

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    };
  }));

  document.addEventListener('mouseup', event => {
    if (dragging) dragging = false;
  });
};


//--------------------переключатель модов--------------------
function modeSwitcher(modeName) {
  modeState = modeName;
  
  if(modeState === 'new') {
    Array.from(menuBtns).forEach(btn => {
      if (btn.classList.contains('new') || 
            btn.classList.contains('drag')) {
        btn.style = 'display: inline-block';
      } else {
        btn.style = 'display: none';
      };
    });
  } else {
    Array.from(menuBtns).forEach(btn => {
      if (btn.classList.contains('burger') || 
          btn.classList.contains('drag') || 
          btn.classList.contains(`${modeName}`)||
          btn.classList.contains(`${modeName}-tools`)) {
        btn.style = 'display: inline-block';
      } else {
        btn.style = 'display: none';
      };
    });
  };
};


//--------------------загрузить существующее--------------------
function loadExistingImage(id) {
  modeSwitcher('comments');
  preloader.style = 'display: block;';
  webSocket = new WebSocket(`wss://neto-api.herokuapp.com/pic/${id}`);
  
  webSocket.addEventListener('message', event => {
    try {
      const data = JSON.parse(event.data)
      if (data.event === 'pic') {
        currentImageId = data.pic.id;
        currentImageLink = data.pic.url;
        currentImage.src = currentImageLink;

        // инициализируем моды с полученными данными после загрузки изображения
        currentImage.addEventListener('load', event => {
          preloader.style = 'display: none;';
          initDrawingMode(data.pic.mask);
          initCommentingMode(data.pic.comments);
          initSharingMode();
        });
      } else if (data.event === 'comment') {
        addLoadedComments({comment: data.comment});
      } else if (data.event === 'mask') {
        addLoadedMask(data.url);
      };
      
    } catch (e) {
      onError();
    };
  })
  
  webSocket.addEventListener('error', event => onError);
  
  const onError = () => {
    modeSwitcher('new');
    preloader.style = 'display: none;';
    errorMsg.textContent = 'Не удалось загрузить изображение. Пожалуйста, перезагрузите страницу или загрузите новое изображение.'
    error.style = 'display: block;'
  };
  
};


//--------------------загрузить новое--------------------
function initPostingMode() {
//  добавляем невидимый инпут чтобы с помощью него загружать изображения посредством кнопки "загрузить новое"
  const input = document.createElement('input');
  input.type = 'file';
  input.id = 'file-input';
  input.style = 'display: none';
  input.accept = 'image/jpeg, image/png';
  menuAddNewBtn.appendChild(input);
  
  menuAddNewBtn.addEventListener('click', event => {
    error.style = 'display: none;';
    input.click();
  });
  
  input.addEventListener('change', event => {
    if (event.currentTarget.files[0]) sendImg(event.currentTarget.files[0]);
  });
  
  document.addEventListener('dragover', event => event.preventDefault());
  
  document.addEventListener('drop', onDrop);
  
  function onDrop(event) {
    event.preventDefault();
    const errorMsg = document.querySelector('.error')
    if (event.dataTransfer.files[0].type.includes('png') || event.dataTransfer.files[0].type.includes('jpeg')) {
      errorMsg.style = 'display: none;';
      sendImg(event.dataTransfer.files[0]);
    } else {
      errorMsg.style = 'display: block;';
    };
  }
  
  function sendImg(file) {
    const formData = new FormData();
    formData.append('title', file.name);
    formData.append('image', file);
    
    error.style = 'display: none;'
    preloader.style = 'display: block;';
    fetch('https://neto-api.herokuapp.com/pic', {
      body: formData,
      method: 'POST'
    })
    .then((res) => {
      if (200 <= res.status && res.status < 300) {
        return res;
      };
      throw new Error(response.statusText);
    })
    .then((res) => { return res.json(); })
    .then((data) => {
      // при успешной загрузке запрещаем загружать изображения с помощью дропа
      document.removeEventListener('drop', onDrop)
      document.addEventListener('drop', event => {
        errorMsg.textContent = 'Чтобы загрузить новое изображение, пожалуйста, воспользуйтесь пунктом "Загрузить новое" в меню.'
        error.style = 'display: block;';
      });
      
      currentImageId = data.id;
      currentImageLink = data.url;
      currentImage.src = currentImageLink;
      
      // меняем id в ссылке
      history.pushState({page: 1}, 'new image', `?id=${currentImageId}`);
      
      // инициализируем моды, запускаем вебсокет и переходим в режим поделиться после загрузки изображения
      currentImage.addEventListener('load', event => {
        preloader.style = 'display: none;';
        initDrawingMode();
        initCommentingMode();
        initSharingMode();
        webSocket = new WebSocket(`wss://neto-api.herokuapp.com/pic/${currentImageId}`);
        modeSwitcher('share');
      });
    })
    .catch((e) => {
      preloader.style = 'display: none;';
      errorMsg.textContent = 'Не удалось загрузить изображение. Пожалуйста, попробуйте снова.'
      error.style = 'display: block;'
    });
  }
};


//--------------------поделиться--------------------
function initSharingMode() {
  // Пререход в режим Поделиться
  menuShareBtn.addEventListener('click', event => {
    modeSwitcher('share');
  });
  
  const url = menuShareTools.querySelector('.menu__url'),
        copyBtn = menuShareTools.querySelector('.menu_copy');
  
  
  url.value = `https://azeyka.github.io/HJ-30_diplom/?id=${currentImageId}`;
  
  copyBtn.addEventListener('click', event => {
    url.select();
    document.execCommand('copy');
  });
};


//--------------------комментарии--------------------
function initCommentingMode(loadedComments) {
  const canvas = document.getElementById('canvas'),
        previousCommentsForm = document.querySelector('.comments__forms'),
        borders = canvas.getBoundingClientRect();
  
  let x = borders.x, y = borders.y
  
  //  удаляем контенер с комментариями к предыдущему изображению, если есть
  if (previousCommentsForm) app.removeChild(previousCommentsForm)
  
  // Создание нового контейнера, где будут храниться все формы с комментариями
  const commentsForms = document.createElement('div')
  commentsForms.classList.add('comments__forms');
  commentsForms.style.position = 'absolute';

  app.appendChild(commentsForms);
  
  commentsForms.style.left = `${borders.x}px`;
  commentsForms.style.top = `${borders.y}px`;
  
  // Пререход в режим комментирования
  menuCommentsBtn.addEventListener('click', event => {
    modeSwitcher('comments');
  });
  
  // Показать/скрыть комменарии
  menuCommentsTools.addEventListener('click', event => {
    if (event.target.classList.contains('menu__toggle')) {
      Array.from(menuCommentsToolsToggleInputs).forEach(toggle => {
        if (toggle.checked) {
          commentsForms.style = toggle.value === 'on'? 'display: block;' : 'display: none;';
        };
      });  
    };
  });
  
  //  Добавление новой формы в месте клика
  canvas.addEventListener('click', event => {
    if (modeState === 'comments') {
      
  //  Смещение посчитано наполовину вручную, так как когда еще нет комментариев - не с чего рассчитывать. 
  //  Как быть? Вставлять скрытый пример в разметку?
      const currentImageBorders = currentImage.getBoundingClientRect(),
            shiftX = currentImageBorders.x + 20.2,
            shiftY = currentImageBorders.y + 14.5;
      
      addNewCommentForm(event.clientX - shiftX, event.clientY - shiftY);
    };
  });
  
  // Двигаем комментарии при изменении размера окна
  window.addEventListener('resize', throttle(event => {
    const newBorders = canvas.getBoundingClientRect();
    commentsForms.style.left = `${newBorders.x}px`;
    commentsForms.style.top = `${newBorders.y}px`;
  }))
  
  //  загружаем комменты если есть и сворачиваем все формы
  if(loadedComments) addLoadedComments(loadedComments);
  Array.from(commentsForms.children).forEach(form => {
    form.querySelector('.comments__marker-checkbox').checked = false;
  });
};

function createCommentForm(x, y) {
    const commentsForms = document.querySelector('.comments__forms'),
          form = el('form', {class: 'comments__form'}, [
      el('span', {class: 'comments__marker'}, ''),
      el('input', {type: 'checkbox', class: 'comments__marker-checkbox'}, ''),
      el('div', {class: 'comments__body'}, [
        el('div', {class: 'comment', style: 'display: none'}, [
          el('div', {class: 'loader'}, [
            el('span', {}, ''),
            el('span', {}, ''),
            el('span', {}, ''),
            el('span', {}, ''),
            el('span', {}, '')
          ])
        ]),
        el('textarea', {class: 'comments__input', type: 'text', placeholder: 'Напишите комментарий...'}, ''),
        el('input', {class: 'comments__close', type: 'button', value: 'Закрыть'}),
        el('input', {class: 'comments__submit', type: 'submit', value: 'Отправить'})
      ])
    ]);
    
    commentsForms.appendChild(form)

    form.style.left = `${x}px`;
    form.style.top = `${y}px`;
    
    return form
  };
  
function createComment(time, message) {
  const comment = el('div', {class: 'comment'}, [
    el('p', {class: 'comment__time'}, time),
    el('p', {class: 'comment__message'}, message)
  ])
  return comment;
};

function addNewCommentForm(x, y) {
  const commentsForms = document.querySelectorAll('.comments__form'),
        form = createCommentForm(x, y),
        commentsBody = form.querySelector('.comments__body'),
        textarea = form.querySelector('.comments__input'),
        closeBtn = form.querySelector('.comments__close'),
        sendBtn = form.querySelector('.comments__submit'),
        preloader = form.querySelector('.loader').parentElement,
        markerInput = form.querySelector('.comments__marker-checkbox');

  const removeForm = () => { form.parentElement.removeChild(form); },
        closeForm = () => { markerInput.checked = false; },
        sendComment = () => {
          if (textarea.value) {     
            const x = form.style.left.split('px').join(''),
                  y = form.style.top.split('px').join(''),
                  body = 'message=' + encodeURIComponent(textarea.value) +
                         '&left=' + encodeURIComponent(x) +
                         '&top=' + encodeURIComponent(y)
          
            preloader.style = 'display: block;'
            textarea.value = '';
            
            fetch(`https://neto-api.herokuapp.com/pic/${currentImageId}/comments`, {
              body: body,
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            })
            .then((res) => {
                if (200 <= res.status && res.status < 300) {
                  return res;
                };
                throw new Error(response.statusText);
              })
            .then((res) => { return res.json(); })
            .then((data) => {
              markerInput.removeAttribute('disabled');
              preloader.style = 'display: none;';
            })
            .catch((e) => {
              preloader.style = 'display: none;';
            });                  
          };  
        };
   
//  Если в форме есть комментарии, то кнопка закрыть сворачивает форму, если нет, то удаляет
  closeBtn.addEventListener('click', event => {
    const comments = form.querySelectorAll('.comment');
    comments.length <= 1 ? removeForm() : closeForm()    
  });

// Отправка комментария на кнопку отправить
  sendBtn.addEventListener('click', event => {
    event.preventDefault();
    sendComment();
  });

// Отправка комментария на Enter
  textarea.addEventListener('keydown', event => {
    if (event.keyCode === 13) {
      event.preventDefault();
      sendComment();
    };
  });
  
// При клике на маркер формы сворачиваем остальные и удаляем пустые
  markerInput.addEventListener('click', event => {
    if (event.target.checked) {
      const markers = document.querySelectorAll('.comments__marker-checkbox');
      Array.from(markers).forEach(marker => {
        if (!(marker === event.target)) marker.checked = false;
        if (marker.hasAttribute('disabled')) marker.parentElement.parentElement.removeChild(marker.parentElement);
      });
    };
  });
  
  markerInput.checked = true;
  textarea.focus();
  markerInput.setAttribute('disabled', 'disabled');

// При добавлении формы сворачиваем остальные и удаляем пустые
  Array.from(commentsForms).forEach(previousForm => {
    const markerInput = previousForm.querySelector('.comments__marker-checkbox');
    if (markerInput.hasAttribute('disabled')) {
      previousForm.parentElement.removeChild(previousForm);
    } else {
      markerInput.checked = false;
    }; 
  });
  
  return form;
};

function addLoadedComments(loadedComments) {
  let currentForm;
  Object.keys(loadedComments).forEach(key => {
    const commentsForms = document.querySelectorAll('.comments__form'),
          currentImageBorders = currentImage.getBoundingClientRect(),
          x = loadedComments[key].left,
          y = loadedComments[key].top;
    
// проверяем существует ли форма с такими координатами, если нет - создаем новую, да - добавляем в нее комментарий
    const existingForm = Array.from(commentsForms).find(commentsForm => {
      return commentsForm.style.left === `${x}px` && commentsForm.style.top === `${y}px`
    });
    
    currentForm = existingForm ? existingForm : addNewCommentForm(x, y)
           
    const commentBody = currentForm.querySelector('.comments__body'),
          preloader = currentForm.querySelector('.loader').parentElement,
          markerInput = currentForm.querySelector('.comments__marker-checkbox');
    
    const comment = createComment(getTime(loadedComments[key].timestamp), loadedComments[key].message);
    commentBody.insertBefore(comment, preloader)
    markerInput.removeAttribute('disabled');
  });
};

function el(tagName, attributes, children) {
  const element = document.createElement(tagName);
  
  if (typeof attributes === 'object') {
    Object.keys(attributes).forEach(i => element.setAttribute(i, attributes[i]));
  };
  
  if (typeof children === 'string') {
    if (!children.includes('\n')) {
      element.textContent = children;
    } else {
        children.split('\n').forEach(child => {
          const span = document.createElement('span'),
                br = document.createElement('br');

          span.textContent = child;
          element.appendChild(span);
          element.appendChild(br);
        });
    };
    
  } else if (children instanceof Array) {
    children.forEach(child => element.appendChild(child));
  };
  return element;
};

function getTime(timestamp) {
  const time = timestamp ? new Date(timestamp) : new Date(),
        dateArray = [
          time.getFullYear() - 2000,
          time.getMonth() + 1,
          time.getDate(),
          time.getHours(),
          time.getMinutes(),
          time.getSeconds()
        ],
        date = dateArray.map(element => {return element < 10 ?  '0' + element : element});

  return `${date[2]}.${date[1]}.${date[0]} ${date[3]}:${date[4]}:${date[5]}`
};


//--------------------рисование--------------------
function initDrawingMode(loadedMask) {
  let timestamp = new Date();
  
  //  удаляем canvas и маску предыдущего изображения, если есть
  const previousCanvas = document.getElementById('canvas'),
        previousMask = document.getElementById('mask');
  if (previousCanvas) app.removeChild(previousCanvas);
  if (previousMask) app.removeChild(previousMask);
  
  // Создаем новый canvas и маску по размеру изображения
  const imageBorder = currentImage.getBoundingClientRect(), 
        canvas = document.createElement('canvas'),
        mask = document.createElement('img');

  canvas.id = 'canvas';
  canvas.width = imageBorder.width;
  canvas.height = imageBorder.height;
  canvas.style.position = 'absolute';
  canvas.style.left = `${imageBorder.x}px`;
  canvas.style.top = `${imageBorder.y}px`;
  
  mask.id = 'mask';
  mask.width = imageBorder.width;
  mask.height = imageBorder.height;
  mask.style.position = 'absolute';
  mask.style.left = `${imageBorder.x}px`;
  mask.style.top = `${imageBorder.y}px`;
  
  app.appendChild(mask);
  app.appendChild(canvas);

  const ctx = canvas.getContext('2d'),
        brushRadius = 4,
        colors = {
          red: '#ea5d56',
          yellow: '#f3d135',
          green: '#6cbe47',
          blue: '#53a7f5',
          purple: '#b36ade'
        };

  let drawing = false,
      brushColor,
      previousPoint;
  
  //  загружаем уже существующую маску, если есть
  if (loadedMask) addLoadedMask(loadedMask);
  
  // Переключение в режим рисования
  menuDrawBtn.addEventListener('click', event => {
    modeSwitcher('draw');
  });
  
  canvas.addEventListener('mousedown', event => {
    if (modeState === 'draw') {
      drawing = true;
      previousPoint = [event.offsetX, event.offsetY];
      Array.from(menuDrawTools.children).forEach(color => {
        if (color.checked) brushColor = colors[color.value];
      });
      
//      запуск отправки данных на сервер
      tick();
    };
  })
  
  canvas.addEventListener('mousemove', throttle(event => {
    if (modeState === 'draw' && drawing) draw([event.offsetX, event.offsetY]);
  }));
  
  canvas.addEventListener('mouseup', event => {
    drawing = false;    
  });
  
  canvas.addEventListener('mouseleave', event => {
    drawing = false;    
  });
  
//  двигаем канвас и маску вместе с изображением при изменении размера экрана
  window.addEventListener('resize', throttle(event => {
    const imageNewBorder = currentImage.getBoundingClientRect();
    canvas.style.left = `${imageNewBorder.x}px`;
    canvas.style.top = `${imageNewBorder.y}px`;
    mask.style.left = `${imageNewBorder.x}px`;
    mask.style.top = `${imageNewBorder.y}px`;
  }));
  
  function draw(point) {
    ctx.beginPath();
    ctx.lineWidth = brushRadius;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = brushColor;
    ctx.quadraticCurveTo(...previousPoint, ...point); 
    ctx.stroke();
    previousPoint = point;
  };
  
  function tick() {
    //обновление и очистка канваса каждые 2 секунды при рисовании и один раз после того как закончили штрих 
    if (drawing === true) {
      const now = new Date();
      if (now - timestamp >= 2000) {
        canvas.toBlob(img => webSocket.send(img));
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        timestamp = now;
      };

      window.requestAnimationFrame(tick);
    } else {
      canvas.toBlob(img => webSocket.send(img));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  };
};

function addLoadedMask(maskLink) {
  const mask = document.getElementById('mask');
  mask.src = maskLink;
};


//--------------------оптимизация--------------------
function throttle(callback) {
  let isWaiting = false;
  return function () {
    if (!isWaiting) {
      callback.apply(this, arguments);
      isWaiting = true;
      requestAnimationFrame(() => {
        isWaiting = false;
      });
    };
  };
};