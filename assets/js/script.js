// Состояние приложения при инициализации
const state = {
  currentEditingNote: null,
  notes: [],
  currentView: "all",
  currentSort: "dateDesc",
  selectedTags: [],
  searchQuery: "",
};

// Инициализация приложения
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});
// Функция инициализации приложения
function initializeApp() {
  loadNotes();
  initializeTheme();
  initializeEditor();
  initializeEventListeners();
  initializeAuthModals();
  initializeFilters();
  initializeSearch();
  updateTagsFilter();
  showNotesList();
}

// Загрузка заметок
function loadNotes() {
  state.notes = JSON.parse(localStorage.getItem("notes") || "[]");
  refreshNotesList();
}

// Инициализация темы
function initializeTheme() {
  const themeToggle = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme");

  if (
    savedTheme === "dark" ||
    (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    document.body.classList.add("dark-mode");
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem(
      "theme",
      document.body.classList.contains("dark-mode") ? "dark" : "light",
    );
  });
}

// Инициализация редактора
function initializeEditor() {
  const editor = document.getElementById("editor");

  // Создаем функцию для форматирования
  const formatText = (command, value = null) => {
    // Сохраняем текущее выделение
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    // Создаем span с нужным стилем
    const span = document.createElement("span");

    switch (command) {
      case "bold":
        span.style.fontWeight = "bold";
        break;
      case "italic":
        span.style.fontStyle = "italic";
        break;
      case "underline":
        span.style.textDecoration = "underline";
        break;
      case "fontName":
        span.style.fontFamily = value;
        break;
      case "fontSize":
        span.style.fontSize = value + "px";
        break;
    }

    span.appendChild(range.extractContents());
    range.insertNode(span);
  };

  // Обработчики для кнопок форматирования
  document
    .querySelectorAll(".editor-toolbar button[data-command]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const command = button.dataset.command;
        formatText(command);
        button.classList.toggle("active");
      });
    });

  // Обработчики для выбора шрифта и размера
  document.getElementById("fontSelect").addEventListener("change", (e) => {
    formatText("fontName", e.target.value);
  });

  document.getElementById("fontSizeSelect").addEventListener("change", (e) => {
    formatText("fontSize", e.target.value);
  });

  // Обработчик для добавления тегов
  const tagInput = document.getElementById("tagInput");
  const tagColor = document.getElementById("tagColor");

  tagInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(e.target.value, tagColor.value);
      e.target.value = "";
    }
  });
}

// Инициализация обработчиков событий
function initializeEventListeners() {
  // Кнопка создания новой записи
  document.getElementById("newNote").addEventListener("click", () => {
    state.currentEditingNote = null;
    showEditor();
  });

  // Кнопка возврата к списку записей
  document.getElementById("backToNotes").addEventListener("click", () => {
    if (confirm("Вы уверены? Несохраненные изменения будут потеряны.")) {
      showNotesList();
    }
  });

  // Кнопка сохранения
  document.getElementById("saveNote").addEventListener("click", saveNote);

  // Обработчики для сайдбара
  document.querySelectorAll("#notesList li").forEach((item) => {
    item.addEventListener("click", (e) => {
      document
        .querySelectorAll("#notesList li")
        .forEach((li) => li.classList.remove("active"));
      item.classList.add("active");
      state.currentView = item.dataset.view;
      refreshNotesList();
    });
  });
}
// Включение редактора
function showEditor(note = null) {
  const editorView = document.querySelector(".editor-view");
  const notesView = document.querySelector(".notes-view");

  editorView.classList.remove("hidden");
  notesView.classList.add("hidden");

  const titleInput = document.getElementById("noteTitle");
  const editorContent = document.getElementById("editor");
  const tagsContainer = document.querySelector(".tags-container");

  if (note) {
    state.currentEditingNote = note;
    titleInput.value = note.title;
    editorContent.innerHTML = note.content;
    tagsContainer.innerHTML = "";
    note.tags.forEach((tag) => addTag(tag.text, tag.color));
  } else {
    state.currentEditingNote = null;
    titleInput.value = "";
    editorContent.innerHTML = "";
    tagsContainer.innerHTML = "";
  }

  titleInput.focus();
}
// Показ списка заметок
function showNotesList() {
  const editorView = document.querySelector(".editor-view");
  const notesView = document.querySelector(".notes-view");

  editorView.classList.add("hidden");
  notesView.classList.remove("hidden");

  state.currentEditingNote = null;
  refreshNotesList();
}

// Фильтрация и поиск
function initializeSearch() {
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener(
    "input",
    debounce((e) => {
      state.searchQuery = e.target.value.toLowerCase();
      refreshNotesList();
    }, 300),
  );
}

// Инициализация фильтров
function initializeFilters() {
  const sortFilter = document.getElementById("sortFilter");
  sortFilter.addEventListener("change", (e) => {
    state.currentSort = e.target.value;
    refreshNotesList();
  });
}

// Фильтрация по тегам
function updateTagsFilter() {
  const tagsFilterList = document.getElementById("tagsFilterList");
  const allTags = new Set();

  state.notes.forEach((note) => {
    note.tags.forEach((tag) => allTags.add(tag.text));
  });

  tagsFilterList.innerHTML = Array.from(allTags)
    .map(
      (tag) => `
            <div class="filter-tag" onclick="toggleTagFilter('${tag}')">
                <input type="checkbox" ${state.selectedTags.includes(tag) ? "checked" : ""}>
                <span>${tag}</span>
            </div>
        `,
    )
    .join("");
}
// Часть работы с тегами
function toggleTagFilter(tag) {
  const index = state.selectedTags.indexOf(tag);
  if (index === -1) {
    state.selectedTags.push(tag);
  } else {
    state.selectedTags.splice(index, 1);
  }
  refreshNotesList();
}

// Управление заметками
function getFilteredAndSortedNotes() {
  let filteredNotes = [...state.notes];

  // Поиск
  if (state.searchQuery) {
    filteredNotes = filteredNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(state.searchQuery) ||
        note.content.toLowerCase().includes(state.searchQuery) ||
        note.tags.some((tag) =>
          tag.text.toLowerCase().includes(state.searchQuery),
        ),
    );
  }

  // Фильтрация по представлению
  if (state.currentView === "favorites") {
    filteredNotes = filteredNotes.filter((note) => note.isFavorite);
  } else if (state.currentView === "tags" && state.selectedTags.length > 0) {
    filteredNotes = filteredNotes.filter((note) =>
      state.selectedTags.every((tag) =>
        note.tags.some((noteTag) => noteTag.text === tag),
      ),
    );
  }

  // Сортировка
  filteredNotes.sort((a, b) => {
    switch (state.currentSort) {
      case "dateDesc":
        return new Date(b.date) - new Date(a.date);
      case "dateAsc":
        return new Date(a.date) - new Date(b.date);
      case "nameAsc":
        return a.title.localeCompare(b.title);
      case "nameDesc":
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });

  return filteredNotes;
}

// Обновление списка заметок и рендеринг их на странице
function refreshNotesList() {
  const notesContainer = document.getElementById("notesContainer");
  const filteredNotes = getFilteredAndSortedNotes();

  if (filteredNotes.length === 0) {
    notesContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-sticky-note"></i>
        <p>Записей пока нет</p>
      </div>
    `;
  } else {
    notesContainer.innerHTML = filteredNotes
      .map(
        (note) => `
          <div class="card">
            <div class="card-header">
              <h4>${note.title}</h4>
              <div class="card-meta">
                <span class="date">${new Date(note.date).toLocaleDateString()}</span>
                <button class="favorite-btn" onclick="toggleFavorite(${note.id})">
                  <i class="fas fa-star ${note.isFavorite ? "active" : ""}"></i>
                </button>
              </div>
            </div>
            <div class="card-content">${note.content}</div>
            ${
              note.tags && note.tags.length > 0
                ? `
              <div class="tags">
                ${note.tags
                  .map(
                    (tag) => `
                  <span class="tag" style="background-color: ${tag.color || "#3b82f6"}">
                    ${tag.text}
                  </span>
                `,
                  )
                  .join("")}
              </div>
            `
                : ""
            }
            <div class="card-actions">
              <button class="edit-btn" onclick="editNote(${note.id})">
                <i class="fas fa-edit"></i> Редактировать
              </button>
              <button class="delete-btn" onclick="deleteNote(${note.id})">
                <i class="fas fa-trash"></i> Удалить
              </button>
            </div>
          </div>
        `,
      )
      .join("");
  }

  updateTagsFilter();
}

// Управление тегами
function addTag(tagText, color = "#3b82f6") {
  tagText = tagText.trim();
  if (!tagText) return;

  const tagsContainer = document.querySelector(".tags-container");
  const existingTags = Array.from(
    tagsContainer.querySelectorAll(".tag-text"),
  ).map((tag) => tag.textContent.trim());

  if (existingTags.includes(tagText)) {
    showToast("Этот тег уже существует", "warning");
    return;
  }

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.style.backgroundColor = color;

  const tagContent = document.createElement("span");
  tagContent.className = "tag-text";
  tagContent.textContent = tagText;

  const removeButton = document.createElement("span");
  removeButton.className = "remove-tag";
  removeButton.innerHTML = "&times;";
  removeButton.onclick = () => tag.remove();

  tag.appendChild(tagContent);
  tag.appendChild(removeButton);
  tagsContainer.appendChild(tag);
}

// Управление заметками
function saveNote() {
  const title = document.getElementById("noteTitle").value.trim();
  const content = document.getElementById("editor").innerHTML;
  const tags = Array.from(
    document.querySelectorAll(".tags-container .tag"),
  ).map((tag) => ({
    text: tag.querySelector(".tag-text").textContent.trim(), // Изменено
    color: tag.style.backgroundColor,
  }));

  if (!title) {
    showToast("Пожалуйста, введите название", "error");
    return;
  }

  const note = {
    id: state.currentEditingNote?.id || Date.now(),
    title,
    content,
    tags,
    date: new Date().toISOString(),
    isFavorite: state.currentEditingNote?.isFavorite || false,
  };

  if (state.currentEditingNote) {
    const index = state.notes.findIndex(
      (n) => n.id === state.currentEditingNote.id,
    );
    if (index !== -1) {
      state.notes[index] = note;
    }
  } else {
    state.notes.unshift(note);
  }

  saveNotesToStorage();
  showToast("Заметка сохранена", "success");
  showNotesList();
}
// Функция редактирования заметки
function editNote(noteId) {
  const note = state.notes.find((n) => n.id === noteId);
  if (note) {
    showEditor(note);
  }
}
// Функция удаления заметки
function deleteNote(noteId) {
  if (confirm("Вы уверены, что хотите удалить эту заметку?")) {
    state.notes = state.notes.filter((note) => note.id !== noteId);
    saveNotesToStorage();
    refreshNotesList();
    showToast("Заметка удалена", "success");
  }
}
// Функция добавления в избранное
function toggleFavorite(noteId) {
  const note = state.notes.find((n) => n.id === noteId);
  if (note) {
    note.isFavorite = !note.isFavorite;
    saveNotesToStorage();
    refreshNotesList();
    showToast(
      note.isFavorite ? "Добавлено в избранное" : "Удалено из избранного",
      "success",
    );
  }
}

// Утилиты
function saveNotesToStorage() {
  localStorage.setItem("notes", JSON.stringify(state.notes));
}
// Всплывающее уведомление
function showToast(message, type = "error") {
  const toastContainer = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
        ${message}
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease-out forwards";
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}
// Функция для отложенного выполнения функции
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Инициализация модальных окон авторизации
function initializeAuthModals() {
  const loginBtn = document.getElementById("loginBtn");
  const loginModal = document.getElementById("loginModal");
  const registerModal = document.getElementById("registerModal");

  loginBtn?.addEventListener("click", () => {
    loginModal.style.display = "flex";
  });

  document.querySelectorAll(".close-modal").forEach((button) => {
    button.addEventListener("click", () => {
      loginModal.style.display = "none";
      registerModal.style.display = "none";
    });
  });

  document.querySelector(".show-register")?.addEventListener("click", () => {
    loginModal.style.display = "none";
    registerModal.style.display = "flex";
  });

  document.querySelector(".show-login")?.addEventListener("click", () => {
    registerModal.style.display = "none";
    loginModal.style.display = "flex";
  });

  // Закрытие по Esc
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      loginModal.style.display = "none";
      registerModal.style.display = "none";
    }
  });

  // Закрытие при клике вне модального окна
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      e.target.style.display = "none";
    }
  });

  // Предотвращение закрытия при клике внутри модального окна
  document.querySelectorAll(".modal-content").forEach((content) => {
    content.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  });
}
