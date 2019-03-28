const app = document.querySelector('.app'),
      currentImage = document.querySelector('.current-image');

let modeState, currentImageId, currentImageLink, currentImageTimestamp;

const menu = document.querySelector('.menu'),
      menuBtns = document.querySelectorAll('.menu__item'),
      menuDragBtn = document.querySelector('.drag'),
      menuBurgerBtn = document.querySelector('.burger'),
      menuAddNewBtn = document.querySelector('.new'),
      menuCommentsBtn = document.querySelector('.comments'),
      menuDrawBtn = document.querySelector('.draw'),
      menuShareBtn = document.querySelector('.share'),

      menuDrawTools = document.querySelector('.draw-tools'),
      menuShareTools = document.querySelector('.share-tools');

const menuCommentsTools = document.querySelector('.comments-tools'),
      menuCommentsToolsToggleInputs = document.querySelectorAll('.menu__toggle');

const error = document.querySelector('.error'),
      errorMsg = document.querySelector('.error__message');
      
console.log(document.location.href)
initMenuDragging();
initBurger();
initPostingMode();


currentImage.src ? reviewModeOn('share') : postingModeOn();

function initPostingMode() {
  const input = document.createElement('input');
  input.type = 'file';
  input.id = 'file-input';
  input.style = 'display: none';
  input.accept = 'image/jpeg, image/png';
  menuAddNewBtn.appendChild(input);
  
  menuAddNewBtn.addEventListener('click', event => input.click())
  
  input.addEventListener('change', event => {
    if (event.currentTarget.files[0]) sendImg(event.currentTarget.files[0]);
  });
  
  document.addEventListener('dragover', event => event.preventDefault());
  
  document.addEventListener('drop', event => {
    event.preventDefault();
    const errorMsg = document.querySelector('.error')
    console.log(event.dataTransfer.files[0].type.includes('jpeg'))
    if (event.dataTransfer.files[0].type.includes('png') || event.dataTransfer.files[0].type.includes('jpeg')) {
      errorMsg.style = 'display: none;';
      sendImg(event.dataTransfer.files[0]);
    } else {
      errorMsg.style = 'display: block;';
    };
  });
  
  function sendImg(file) {
    const preloader = document.querySelector('.image-loader'),
          formData = new FormData();
    console.log(file)
    formData.append('title', file.name);
    formData.append('image', file);
    
    error.style = 'display: none;'
    preloader.style = 'display: block;';
    fetch('https://neto-api.herokuapp.com/pic', {
      body: formData,
      method: 'POST'
//      headers: {
//      'Content-Type': 'multipart/form-data'
//      }
    })
    .then((res) => {
      if (200 <= res.status && res.status < 300) {
        return res;
      };
      throw new Error(response.statusText);
    })
    .then((res) => { return res.json(); })
    .then((data) => {
      console.log(data)
      
      currentImageId = data.id;
      currentImageLink = data.url;
      currentImageTimestamp = data.timestamp;
      currentImage.src = currentImageLink;
      
      currentImage.addEventListener('load', event => {
        preloader.style = 'display: none;';
        initDrawingMode();
        initCommentingMode();
        initSharingMode();
        reviewModeOn('share');
      });
      
    })
    .catch((e) => {
      preloader.style = 'display: none;';
      errorMsg.textContent = 'Не удалось загрузить изображение. Пожалуйста, попробуйте снова.'
      error.style = 'display: block;'
    });
    
    
//    currentImage.src = URL.createObjectURL(file);
//    currentImage.addEventListener('load', event => {
//      preloader.style = 'display: none;';
//      reviewModeOn('share');
//      initDrawingMode();
//      initCommentingMode();
//      initSharingMode();
//      
//      URL.revokeObjectURL(event.target.src);
//    });
//    fetch()
  }
};

function initCommentingMode() {
  const canvas = document.getElementById('canvas'),
        previousCommentsForm = document.querySelector('.comments__forms');
  
//  удаляем контенер с комментариями к предыдущему изображению, если есть
  if (previousCommentsForm) app.removeChild(previousCommentsForm)
  
  // Создание нового контейнера, где будут храниться все формы с комментариями
  const commentsForms = document.createElement('div')
  commentsForms.classList.add('comments__forms');
  app.appendChild(commentsForms);
  
  // Пререход в режим комментирования
  menuCommentsBtn.addEventListener('click', event => {
    reviewModeOn('comments');
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
      const commentsForms = document.querySelectorAll('.comments__form'),
            form = createCommentForm(event.clientX, event.clientY),
            commentsBody = form.querySelector('.comments__body'),
            textarea = form.querySelector('.comments__input'),
            closeBtn = form.querySelector('.comments__close'),
            sendBtn = form.querySelector('.comments__submit'),
            loader = form.querySelector('.loader').parentElement,
            markerInput = form.querySelector('.comments__marker-checkbox');
      
      const removeForm = function () {
        form.parentElement.removeChild(form);
      }
      
      closeBtn.addEventListener('click', removeForm);
      
      sendBtn.addEventListener('click', event => {
        event.preventDefault();
        if (textarea.value) {
          const comment = createComment(getCurrentTime(), textarea.value);
          
//          fetch() send comment then
          //      loader.style = 'display: block;'
          commentsBody.appendChild(comment)
          textarea.value = ''
          markerInput.removeAttribute('disabled');
          
          // Перепрограммируем кнопку закрыть на сворачивание формы
          closeBtn.removeEventListener('click', removeForm);
          closeBtn.addEventListener('click', event => {
            markerInput.checked = false;
          });
          
          
        }
      });
      
      // При клике на маркер формы сворачиваем остальные
      markerInput.addEventListener('click', event => {
        if (event.target.checked) {
          const markers = document.querySelectorAll('.comments__marker-checkbox');
          Array.from(markers).forEach(marker => {
            if (!(marker === event.target)) marker.checked = false;
          });
        };
      });
      
      markerInput.checked = true;
      textarea.focus();
      markerInput.setAttribute('disabled', 'disabled')

//    При добавлении новой формы сворачиваем все остальные формы либо удаляем если комментарии не были добавлены
      Array.from(commentsForms).forEach(previousForm => {
        const markerInput = previousForm.querySelector('.comments__marker-checkbox');
        if (markerInput.hasAttribute('disabled')) {
          previousForm.parentElement.removeChild(previousForm);
        } else {
          markerInput.checked = false;
        }; 
      });
      
      

      
      
    }
  })
  
  function createCommentForm(x, y) {
    const form = el('form', {class: 'comments__form'}, [
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
    
    const marker = form.querySelector('.comments__marker');
    form.style.left = `${x - 8 - marker.offsetWidth / 2}px`;
    form.style.top = `${y + 10 - marker.offsetHeight}px`;
    
    return form
  }
  
  function createComment(time, message) {
    const comment = el('div', {class: 'comment'}, [
      el('p', {class: 'comment__time'}, time),
      el('p', {class: 'comment__message'}, message)
    ])
    return comment;
  }
  
  function getCurrentTime() {
    const time = new Date(),
          dateArray = [
            time.getFullYear() - 2000,
            time.getMonth() + 1,
            time.getDate(),
            time.getHours(),
            time.getMinutes(),
            time.getSeconds()
          ],
          date = dateArray.map(element => {return element < 10 ?  '0' + element : element});

    return `${date[0]}.${date[1]}.${date[2]} ${date[3]}:${date[4]}:${date[5]}`
  }
};

function initDrawingMode() {
  //  удаляем canvas предыдущего изображения, если есть
  const previousCanvas = document.querySelector('canvas');
  if (previousCanvas) app.removeChild(previousCanvas);
  
  const imageBorder = currentImage.getBoundingClientRect(), 
        canvas = document.createElement('canvas');

  canvas.id = 'canvas';
  canvas.width = imageBorder.width;
  canvas.height = imageBorder.height;
  canvas.style.position = 'absolute';
  canvas.style.left = `${imageBorder.x}px`;
  canvas.style.top = `${imageBorder.y}px`;

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

  menuDrawBtn.addEventListener('click', event => {
    reviewModeOn('draw');
  });
  
  canvas.addEventListener('mousedown', event => {
    if (modeState === 'draw') {
      drawing = true;
      previousPoint = [event.offsetX, event.offsetY];
      Array.from(menuDrawTools.children).forEach(color => {
        if (color.checked) brushColor = colors[color.value];
      });
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
};

function initSharingMode() {
  // Пререход в режим Поделиться
  menuShareBtn.addEventListener('click', event => {
    reviewModeOn('share');
  });
  
  const url = menuShareTools.querySelector('.menu__url'),
        copyBtn = menuShareTools.querySelector('.menu_copy');
  
  
  url.value = currentImageLink;
  
  copyBtn.addEventListener('click', event => {
    url.select();
    document.execCommand('copy');
  });
};

function postingModeOn() {
  Array.from(menuBtns).forEach(btn => {
    if (btn.classList.contains('new') || 
          btn.classList.contains('drag')) {
      btn.style = 'display: inline-block'
    } else {
      btn.style = 'display: none';
    };
  });
};

function reviewModeOn(modeName) {
  modeState = modeName;
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
    }
  }));

  document.addEventListener('mouseup', event => {
    if (dragging) dragging = false;
  });
};

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



