// 🔥 FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getDatabase, ref, onValue, off, update } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

// 🔥 FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCeOJs6sjZCCmvhAftzrUeUyZ6wB4oXHNw",
  authDomain: "evites-qr-code.firebaseapp.com",
  databaseURL: "https://evites-qr-code-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "evites-qr-code",
  storageBucket: "evites-qr-code.firebasestorage.app",
  messagingSenderId: "976591325172",
  appId: "1:976591325172:web:2ace676721ba1876bf5ba1",
  measurementId: "G-92Z6LNP9N3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// =====================
// AVAILABLE CLASSES
// =====================
const availableClasses = [
  { id: "pointe", name: "Pointe Shoes Class", color: "#ff9f43" }
];

const qrLinks = {
  wed: "https://evites-qr-cod.netlify.app/student.html?class=wed",
  sun: "https://evites-qr-cod.netlify.app/student.html?class=sun",
  custom: "https://evites-qr-cod.netlify.app/student.html?class=custom",
  pointe: "https://evites-qr-cod.netlify.app/student.html?class=custom"
};

// =====================
// STATE
// =====================
const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
let weekStartDate = getWeekStart(today);
let currentView = "month";
let selectedDateKey = null;
let selectedClassId = null;
let currentListenerRef = null;
let customClasses = new Set(); // Track dates with custom classes
let removedClasses = new Set(); // Track removed Wed/Sun classes
let selectedDate = null;
let allCheckinsData = {};
let allTimeCounts = {};

// =====================
// HELPERS
// =====================
function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function buildDateKey(date, classId) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}_${classId}`;
}

function getClassId(dayOfWeek) {
  if (dayOfWeek === 3) return "wed";
  if (dayOfWeek === 0) return "sun";
  return null;
}

function dateToDateKey(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function getMonthTitle(year, month) {
  const monthNames = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];
  return monthNames[month] + " " + year;
}

function getWeekTitle(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month1 = monthNames[startDate.getMonth()];
  const month2 = monthNames[endDate.getMonth()];
  const day1 = startDate.getDate();
  const day2 = endDate.getDate();

  if (startDate.getMonth() === endDate.getMonth()) {
    return `${month1} ${day1} - ${day2}`;
  } else {
    return `${month1} ${day1} - ${month2} ${day2}`;
  }
}

function buildMonth(year, month) {
  const dayHeaders = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  let html = '<div class="cal-grid">';
  dayHeaders.forEach(d => html += `<div class="cal-header">${d}</div>`);

  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  for (let i = 0; i < startDow; i++) {
    html += '<div class="cal-day empty"></div>';
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = dateToDateKey(date);
    const classId = getClassId(date.getDay());
    const isRemoved = classId && removedClasses.has(`${dateStr}_${classId}`);
    const isCustom = customClasses.has(dateStr);
    const isToday = date.toDateString() === today.toDateString();

    let cls = "cal-day";
    if (isRemoved) cls += " no-class";
    else if (classId === "wed") cls += " class-wed";
    else if (classId === "sun") cls += " class-sun";
    else if (isCustom) cls += " class-custom";
    else cls += " no-class";
    if (isToday) cls += " today";

    const effectiveClassId = (classId && !isRemoved) ? classId : (isCustom ? "custom" : null);
    const dateKey = effectiveClassId ? buildDateKey(date, effectiveClassId) : "";

    html += `<div class="${cls}" data-key="${dateKey}" data-class="${effectiveClassId}" data-date="${date.toISOString()}">${day}</div>`;
  }

  html += "</div>";
  return html;
}

function buildWeek(startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  let html = '<div class="week-grid">';

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = dateToDateKey(date);
    const classId = getClassId(date.getDay());
    const isRemoved = classId && removedClasses.has(`${dateStr}_${classId}`);
    const isCustom = customClasses.has(dateStr);
    const isToday = date.toDateString() === today.toDateString();

    let cls = "week-day";
    if (isRemoved) cls += " no-class";
    else if (classId === "wed") cls += " class-wed";
    else if (classId === "sun") cls += " class-sun";
    else if (isCustom) cls += " class-custom";
    else cls += " no-class";
    if (isToday) cls += " today";

    const effectiveClassId = (classId && !isRemoved) ? classId : (isCustom ? "custom" : null);
    const dateKey = effectiveClassId ? buildDateKey(date, effectiveClassId) : "";

    const dayName = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][date.getDay()];

    html += `<div class="${cls}" data-key="${dateKey}" data-class="${effectiveClassId}" data-date="${date.toISOString()}">
      <div class="week-day-name">${dayName}</div>
      <div class="week-day-num">${date.getDate()}</div>
    </div>`;
  }

  html += '</div>';
  return html;
}

function hasClass(date) {
  const dateKey = dateToDateKey(date);
  const classId = getClassId(date.getDay());
  return classId || customClasses.has(dateKey);
}

function getClassTypeForDate(date) {
  const dateKey = dateToDateKey(date);
  const classId = getClassId(date.getDay());

  // Check if Wed/Sun is removed
  if (classId && removedClasses.has(`${dateKey}_${classId}`)) {
    return null; // Class was removed
  }

  if (classId) return classId;
  if (customClasses.has(dateKey)) return "custom";
  return null;
}

// =====================
// LOAD CUSTOM CLASSES & REMOVED CLASSES
// =====================
const customClassesRef = ref(db, "customClasses");
onValue(customClassesRef, (snapshot) => {
  customClasses.clear();
  if (snapshot.exists()) {
    Object.keys(snapshot.val()).forEach(dateKey => {
      customClasses.add(dateKey);
    });
  }
  renderCalendar();
});

const removedClassesRef = ref(db, "removedClasses");
onValue(removedClassesRef, (snapshot) => {
  removedClasses.clear();
  if (snapshot.exists()) {
    Object.keys(snapshot.val()).forEach(dateKey => {
      removedClasses.add(dateKey);
    });
  }
  renderCalendar();
});

// =====================
// ADD/REMOVE CLASS
// =====================
async function addCustomClass(dateStr, classType = "custom") {
  const updates = {};
  if (classType === "custom") {
    updates[`customClasses/${dateStr}`] = true;
  } else if (classType === "wed" || classType === "sun") {
    // Unremove Wed/Sun
    updates[`removedClasses/${dateStr}_${classType}`] = null;
  }
  await update(ref(db), updates);
}

async function removeCustomClass(dateStr, classType = "custom") {
  const updates = {};
  if (classType === "custom") {
    updates[`customClasses/${dateStr}`] = null;
    updates[`checkins/${dateStr}_custom`] = null;
  } else if (classType === "wed" || classType === "sun") {
    // Mark Wed/Sun as removed
    updates[`removedClasses/${dateStr}_${classType}`] = true;
  }
  await update(ref(db), updates);
}

// =====================
// CALENDAR RENDER
// =====================
function renderCalendar() {
  renderSwipeCalendars();
}

const track = document.getElementById("calendarTrack");

let startX = 0;
let currentX = 0;
let isDragging = false;
let containerWidth = 0;
let titleContainerWidth = 0;

function updateContainerWidth() {
  containerWidth = document.getElementById("calendarWrapper").offsetWidth;
  titleContainerWidth = document.getElementById("titleWrapper").offsetWidth;
}

track.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
  currentX = startX;
  isDragging = true;
  updateContainerWidth(); // Ensure width is current

  track.style.transition = "none";
});

track.addEventListener("touchmove", (e) => {
  if (!isDragging) return;

  currentX = e.touches[0].clientX;
  const diff = currentX - startX;

  track.style.transform = `translateX(${ -containerWidth + diff }px)`;
  document.getElementById("titleTrack").style.transform = `translateX(${ -titleContainerWidth + diff }px)`;
});

track.addEventListener("touchend", () => {
  if (!isDragging) return;
  isDragging = false;

  const diff = currentX - startX;
  const threshold = 60;
  const titleTrack = document.getElementById("titleTrack");

  track.style.transition = "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)";
  titleTrack.style.transition = "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)";

  if (diff < -threshold) {
    track.style.transform = `translateX(${-2 * containerWidth}px)`;
    titleTrack.style.transform = `translateX(${-2 * titleContainerWidth}px)`;

    setTimeout(() => {
      if (currentView === "month") {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      } else {
        weekStartDate.setDate(weekStartDate.getDate() + 7);
      }
      renderCalendar();
      const tt = document.getElementById("titleTrack");
      tt.style.transition = "none";
      tt.style.transform = `translateX(-${titleContainerWidth}px)`;
    }, 350);

  } else if (diff > threshold) {
    track.style.transform = `translateX(0px)`;
    titleTrack.style.transform = `translateX(0px)`;

    setTimeout(() => {
      if (currentView === "month") {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      } else {
        weekStartDate.setDate(weekStartDate.getDate() - 7);
      }
      renderCalendar();
      const tt = document.getElementById("titleTrack");
      tt.style.transition = "none";
      tt.style.transform = `translateX(-${titleContainerWidth}px)`;
    }, 350);

  } else {
    track.style.transform = `translateX(-${containerWidth}px)`;
    titleTrack.style.transform = `translateX(-${titleContainerWidth}px)`;
  }
});

function renderSwipeCalendars() {
  const track = document.getElementById("calendarTrack");
  updateContainerWidth(); // Ensure width is current for this render

  if (currentView === "month") {
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;

    if (prevMonth < 0) { prevMonth = 11; prevYear--; }
    if (nextMonth > 11) { nextMonth = 0; nextYear++; }

    track.innerHTML = `
      <div class="calendar-page">${buildMonth(prevYear, prevMonth)}</div>
      <div class="calendar-page">${buildMonth(currentYear, currentMonth)}</div>
      <div class="calendar-page">${buildMonth(nextYear, nextMonth)}</div>
    `;
  } else {
    // Week view
    const prevWeekStart = new Date(weekStartDate);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const nextWeekStart = new Date(weekStartDate);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    track.innerHTML = `
      <div class="calendar-page">${buildWeek(prevWeekStart)}</div>
      <div class="calendar-page">${buildWeek(weekStartDate)}</div>
      <div class="calendar-page">${buildWeek(nextWeekStart)}</div>
    `;
  }

  track.style.transition = "none";
  track.style.transform = `translateX(-${containerWidth}px)`;

  attachDayHandlers(track);
  renderTitleTrack();
  applySelection();
}

function applySelection() {
  if (!selectedDate) return;
  const target = selectedDate.toDateString();
  document.querySelectorAll("[data-date]").forEach(cell => {
    if (new Date(cell.dataset.date).toDateString() === target) {
      cell.classList.add("selected");
    }
  });
}

function renderTitleTrack() {
  const titleTrack = document.getElementById("titleTrack");

  if (currentView === "month") {
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;

    if (prevMonth < 0) { prevMonth = 11; prevYear--; }
    if (nextMonth > 11) { nextMonth = 0; nextYear++; }

    titleTrack.innerHTML = `
      <div class="title-page">${getMonthTitle(prevYear, prevMonth)}</div>
      <div class="title-page">${getMonthTitle(currentYear, currentMonth)}</div>
      <div class="title-page">${getMonthTitle(nextYear, nextMonth)}</div>
    `;
  } else {
    const prevWeekStart = new Date(weekStartDate);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const nextWeekStart = new Date(weekStartDate);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    titleTrack.innerHTML = `
      <div class="title-page">${getWeekTitle(prevWeekStart)}</div>
      <div class="title-page">${getWeekTitle(weekStartDate)}</div>
      <div class="title-page">${getWeekTitle(nextWeekStart)}</div>
    `;
  }
}

function attachDayHandlers(grid) {
  grid.querySelectorAll("[data-date]").forEach(cell => {
    cell.onclick = () => {
      const dateKey = cell.dataset.key || null;
      const rawClass = cell.dataset.class;
      const classId = (rawClass && rawClass !== "null") ? rawClass : null;
      onDateClick(dateKey, classId, new Date(cell.dataset.date));
    };
    cell.ondblclick = (e) => {
      e.stopPropagation();
      const dateKey = cell.dataset.key || null;
      const rawClass = cell.dataset.class;
      const classId = (rawClass && rawClass !== "null") ? rawClass : null;
      onDateClick(dateKey, classId, new Date(cell.dataset.date));
      // Small delay to ensure panel content is updated before opening
      setTimeout(() => {
        if (selectedDateKey) listenToStudents(selectedDateKey);
        openPanel();
      }, 10);
    };
  });
}

// =====================
// DATE CLICK
// =====================
function onDateClick(dateKey, classId, date) {
  lastClickedDate = date;
  selectedDate = date;
  const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  if (!classId) {
    selectedDateKey = null;
    selectedClassId = null;
    document.getElementById("panelTitle").innerHTML = "<div style='font-size: 14px; color: #999;'>" + dateStr + "</div>";
    document.getElementById("panelNoClass").style.display = "block";
    document.getElementById("panelWithClass").style.display = "none";
  } else {
    selectedDateKey = dateKey;
    selectedClassId = classId;
    document.getElementById("panelTitle").innerHTML = "<div>Pointe Shoes Class</div><div style='font-size: 13px; color: #999; margin-top: 4px;'>" + dateStr + "</div>";
    document.getElementById("panelNoClass").style.display = "none";
    document.getElementById("panelWithClass").style.display = "block";
    document.getElementById("qrWrapper").style.display = "none";
  }

  renderCalendar();
  const track = document.getElementById("calendarTrack");
  updateContainerWidth();
  track.style.transition = "none";
  track.style.transform = `translateX(-${containerWidth}px)`;
  renderStudentsSection();
}

// =====================
// FIREBASE LISTENER
// =====================
function listenToStudents(dateKey) {
  const list = document.getElementById("studentList");
  const countText = document.getElementById("checkinCount");

  if (currentListenerRef) off(currentListenerRef);

  const studentsRef = ref(db, "checkins/" + dateKey);
  currentListenerRef = studentsRef;

  onValue(studentsRef, (snapshot) => {
    list.innerHTML = "";

    if (!snapshot.exists()) {
      countText.textContent = "0 students checked-in";
      return;
    }

    let count = 0;
    snapshot.forEach((child) => {
      const data = child.val();
      const li = document.createElement("li");
      const status = data.status === "paid" ? "paid" : "unpaid";
      const statusColor = status === "paid" ? "#2bb673" : "#e53e3e";
      li.innerHTML = data.name + ' • <span style="color:' + statusColor + '">' + status + "</span>";
      list.appendChild(li);
      count++;
    });

    countText.textContent = count + " students checked-in";
  });
}

// =====================
// PANEL & OPEN BUTTON
// =====================
const panel = document.getElementById("checkinPanel");
const panelContent = document.querySelector(".panel-content");
const openBtn = document.getElementById("openBtn");

function openPanel() {
  // Animate button out
  openBtn.classList.add("hidden");
  panelContent.style.transition = "none";
  panelContent.style.transform = "translateX(-50%) translateY(100%)";
  panelContent.offsetHeight;
  panel.classList.add("active");
  requestAnimationFrame(() => {
    panelContent.style.transition = "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)";
    panelContent.style.transform = "translateX(-50%) translateY(0)";
  });
}

function closePanel() {
  panelContent.style.transition = "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)";
  panelContent.style.transform = "translateX(-50%) translateY(100%)";
  panel.classList.remove("active");
  // Slide button back in after panel starts closing
  setTimeout(() => openBtn.classList.remove("hidden"), 150);
}

panel.onclick = (e) => { if (e.target === panel) closePanel(); };

// =====================
// QR BUTTON
// =====================
document.getElementById("showQrBtn").onclick = () => {
  const wrapper = document.getElementById("qrWrapper");
  if (wrapper.style.display === "none") {
    wrapper.style.display = "block";
    const canvas = document.getElementById("qrCanvas");
    QRCode.toCanvas(canvas, qrLinks[selectedClassId], { width: 220, margin: 2 });
  } else {
    wrapper.style.display = "none";
  }
};

// =====================
// CLASS SELECTION MODAL
// =====================
let lastClickedDate = null;
const modal = document.getElementById("classModal");
const closeModalBtn = document.getElementById("closeModal");

function showClassModal() {
  const container = document.getElementById("classListContainer");
  container.innerHTML = "";

  availableClasses.forEach(cls => {
    const classOption = document.createElement("div");
    classOption.className = "class-option";
    classOption.style.cursor = "pointer";
    classOption.innerHTML = `<div style="font-weight: 600;">${cls.name}</div>`;
    classOption.onclick = () => selectClass(cls.id);
    container.appendChild(classOption);
  });

  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
}

async function selectClass(_classId) {
  if (!lastClickedDate) return;
  const dateStr = dateToDateKey(lastClickedDate);
  const dayOfWeek = lastClickedDate.getDay();
  const defaultClassId = getClassId(dayOfWeek); // "wed", "sun", or null

  // If it's a default Wed/Sun day, re-enable it. Otherwise, add as custom.
  const classTypeToAdd = defaultClassId || "custom";

  // Update UI immediately (optimistic)
  if (classTypeToAdd === "custom") {
    customClasses.add(dateStr);
  } else {
    removedClasses.delete(`${dateStr}_${classTypeToAdd}`);
  }

  closeModal();
  const dateKey = buildDateKey(lastClickedDate, classTypeToAdd);
  onDateClick(dateKey, classTypeToAdd, lastClickedDate);
  renderCalendar();

  // Then sync to Firebase
  await addCustomClass(dateStr, classTypeToAdd);
}

closeModalBtn.onclick = closeModal;
modal.onclick = (e) => { if (e.target === modal) closeModal(); };

// =====================
// ADD/REMOVE CLASS BUTTONS
// =====================
document.getElementById("addClassBtn").onclick = showClassModal;

document.getElementById("removeClassBtn").onclick = async () => {
  if (selectedDateKey && selectedClassId) {
    const dateStr = selectedDateKey.split("_")[0];
    // Update UI immediately
    removedClasses.add(`${dateStr}_${selectedClassId}`);
    closePanel();
    renderCalendar();
    // Then sync to Firebase
    await removeCustomClass(dateStr, selectedClassId);
  }
};

// =====================
// NAVIGATION
// =====================
document.getElementById("prevBtn").onclick = () => {
  if (currentView === "month") {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  } else {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() - 7);
    weekStartDate = d;
  }
  renderCalendar();
};

document.getElementById("nextBtn").onclick = () => {
  if (currentView === "month") {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  } else {
    const d = new Date(weekStartDate);
    d.setDate(d.getDate() + 7);
    weekStartDate = d;
  }
  renderCalendar();
};

// =====================
// VIEW TOGGLE
// =====================
document.getElementById("btnMonth").onclick = () => {
  currentView = "month";
  document.getElementById("btnMonth").classList.add("active");
  document.getElementById("btnWeek").classList.remove("active");
  renderCalendar();
};

document.getElementById("btnWeek").onclick = () => {
  currentView = "week";
  document.getElementById("btnWeek").classList.add("active");
  document.getElementById("btnMonth").classList.remove("active");
  renderCalendar();
};

// =====================
// SWIPE DOWN TO CLOSE
// =====================
let startYPanel = 0;
let currentYPanel = 0;
let isPanelSwiping = false;

panelContent.addEventListener("touchstart", (e) => {
  if (!panel.classList.contains("active")) return;
  startYPanel = e.touches[0].clientY;
  currentYPanel = startYPanel;
  isPanelSwiping = true;
  panelContent.style.transition = "none";
}, { passive: true });

panelContent.addEventListener("touchmove", (e) => {
  if (!isPanelSwiping) return;
  currentYPanel = e.touches[0].clientY;
  const diff = currentYPanel - startYPanel;
  if (diff > 0) {
    e.preventDefault();
    panelContent.style.transform = `translateX(-50%) translateY(${diff}px)`;
  }
}, { passive: false });

panelContent.addEventListener("touchend", () => {
  if (!isPanelSwiping) return;
  isPanelSwiping = false;
  const diff = currentYPanel - startYPanel;
  panelContent.style.transition = "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)";
  if (diff > 80) {
    closePanel();
  } else {
    panelContent.style.transform = "translateX(-50%) translateY(0)";
  }
  startYPanel = 0;
  currentYPanel = 0;
});

// =====================
// ALL STUDENTS — global listener
// =====================
onValue(ref(db, "checkins"), (snapshot) => {
  allCheckinsData = {};
  allTimeCounts = {};

  if (snapshot.exists()) {
    snapshot.forEach((dateSnap) => {
      allCheckinsData[dateSnap.key] = {};
      dateSnap.forEach((checkinSnap) => {
        const data = checkinSnap.val();
        allCheckinsData[dateSnap.key][checkinSnap.key] = data;
        if (data.status === "paid" && data.name) {
          const name = data.name.trim();
          allTimeCounts[name] = (allTimeCounts[name] || 0) + 1;
        }
      });
    });
  }

  renderStudentsSection();
});

function renderStudentsSection() {
  const list = document.getElementById("allStudentsList");
  list.innerHTML = "";

  if (!selectedDateKey) return;

  const dayCheckins = allCheckinsData[selectedDateKey] || {};
  const entries = Object.values(dayCheckins).filter(d => d.name);

  if (entries.length === 0) return;

  entries.sort((a, b) => (a.time || 0) - (b.time || 0));

  entries.forEach(({ name, status }) => {
    const trimmedName = name.trim();
    const totalVisits = allTimeCounts[trimmedName] || 1;
    const li = document.createElement("li");
    const statusColor = status === "paid" ? "#2bb673" : "#e53e3e";
    li.innerHTML = `<span class="student-name">${trimmedName}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:12px;color:${statusColor}">${status}</span>
        <span class="student-count">${totalVisits}</span>
      </div>`;
    list.appendChild(li);
  });
}

// =====================
// OPEN BUTTON
// =====================
openBtn.addEventListener("click", () => {
  // Click pulse animation
  openBtn.style.transform = "translateX(-50%) scale(0.88)";
  setTimeout(() => {
    openBtn.style.transform = "translateX(-50%) scale(1)";
    setTimeout(() => {
      if (selectedDateKey) listenToStudents(selectedDateKey);
      openPanel();
    }, 120);
  }, 120);
});


// =====================
// INIT
// =====================
requestAnimationFrame(() => {
  renderCalendar();
  setTimeout(() => {
    const todayClassId = getClassId(today.getDay());
    const isCustomToday = customClasses.has(dateToDateKey(today));
    const effectiveId = todayClassId || (isCustomToday ? "custom" : null);
    const todayDateKey = effectiveId ? buildDateKey(today, effectiveId) : null;
    onDateClick(todayDateKey, effectiveId, today);
  }, 50);
});
