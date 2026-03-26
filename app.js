// 🔥 FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getDatabase, ref, onValue, off } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

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
// QR LINKS
// =====================
const qrLinks = {
  wed: "https://evites-qr-cod.netlify.app/student.html?class=wed",
  sun: "https://evites-qr-cod.netlify.app/student.html?class=sun",
  custom: "https://evites-qr-cod.netlify.app/student.html?class=custom"
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

function hasClass(date) {
  const dateKey = dateToDateKey(date);
  const classId = getClassId(date.getDay());
  return classId || customClasses.has(dateKey);
}

function getClassTypeForDate(date) {
  const dateKey = dateToDateKey(date);
  const classId = getClassId(date.getDay());
  if (classId) return classId;
  if (customClasses.has(dateKey)) return "custom";
  return null;
}

// =====================
// LOAD CUSTOM CLASSES
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

// =====================
// ADD/REMOVE CLASS
// =====================
async function addCustomClass(dateStr) {
  await ref(db, `customClasses/${dateStr}`).set(true);
}

async function removeCustomClass(dateStr) {
  await ref(db, `customClasses/${dateStr}`).set(null);
  await ref(db, `checkins/${dateStr}_custom`).set(null);
}

// =====================
// CALENDAR RENDER
// =====================
function renderCalendar() {
  if (currentView === "month") renderMonthView();
  else renderWeekView();
}

function renderMonthView() {
  const grid = document.getElementById("calendarGrid");
  const title = document.getElementById("calTitle");

  const monthNames = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];
  title.textContent = monthNames[currentMonth] + " " + currentYear;

  const dayHeaders = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  let html = '<div class="cal-grid">';
  dayHeaders.forEach(d => { html += `<div class="cal-header">${d}</div>`; });

  const firstDay = new Date(currentYear, currentMonth, 1);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;
  for (let i = 0; i < startDow; i++) html += '<div class="cal-day empty"></div>';

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateStr = dateToDateKey(date);
    const classId = getClassId(date.getDay());
    const isCustom = customClasses.has(dateStr);
    const isToday = date.toDateString() === today.toDateString();
    const effectiveClassId = classId || (isCustom ? "custom" : null);
    const dateKey = effectiveClassId ? buildDateKey(date, effectiveClassId) : null;
    const isSelected = dateKey && dateKey === selectedDateKey;

    let cls = "cal-day";
    if (classId === "wed") cls += " class-wed";
    else if (classId === "sun") cls += " class-sun";
    else if (isCustom) cls += " class-custom";
    else cls += " no-class";
    if (isToday) cls += " today";
    if (isSelected) cls += " selected";

    const attrs = `data-key="${dateKey || ''}" data-class="${effectiveClassId || ''}" data-date="${date.toISOString()}"`;
    html += `<div class="${cls}" ${attrs}>${day}</div>`;
  }

  html += '</div>';
  grid.innerHTML = html;
  attachDayHandlers(grid);
}

function renderWeekView() {
  const grid = document.getElementById("calendarGrid");
  const title = document.getElementById("calTitle");

  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmt = { day: "numeric", month: "short" };
  title.textContent = weekStartDate.toLocaleDateString("en-GB", fmt) + " – " + weekEnd.toLocaleDateString("en-GB", fmt);

  const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  let html = '<div class="week-grid">';

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStartDate);
    date.setDate(date.getDate() + i);
    const dateStr = dateToDateKey(date);
    const classId = getClassId(date.getDay());
    const isCustom = customClasses.has(dateStr);
    const isToday = date.toDateString() === today.toDateString();
    const effectiveClassId = classId || (isCustom ? "custom" : null);
    const dateKey = effectiveClassId ? buildDateKey(date, effectiveClassId) : null;
    const isSelected = dateKey && dateKey === selectedDateKey;

    let cls = "week-day";
    if (classId === "wed") cls += " class-wed";
    else if (classId === "sun") cls += " class-sun";
    else if (isCustom) cls += " class-custom";
    else cls += " no-class";
    if (isToday) cls += " today";
    if (isSelected) cls += " selected";

    const attrs = `data-key="${dateKey || ''}" data-class="${effectiveClassId || ''}" data-date="${date.toISOString()}"`;
    html += `<div class="${cls}" ${attrs}>
      <div class="week-day-name">${dayNames[i]}</div>
      <div class="week-day-num">${date.getDate()}</div>
    </div>`;
  }

  html += '</div>';
  grid.innerHTML = html;
  attachDayHandlers(grid);
}

function attachDayHandlers(grid) {
  grid.querySelectorAll("[data-date]").forEach(cell => {
    cell.onclick = () => {
      const dateKey = cell.dataset.key || null;
      const classId = cell.dataset.class || null;
      onDateClick(dateKey, classId, new Date(cell.dataset.date));
    };
  });
}

// =====================
// DATE CLICK
// =====================
function onDateClick(dateKey, classId, date) {
  lastClickedDate = date;
  const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  if (!classId) {
    // No class on this day
    selectedDateKey = null;
    selectedClassId = null;
    document.getElementById("panelTitle").textContent = dateStr;
    document.getElementById("panelNoClass").style.display = "block";
    document.getElementById("panelWithClass").style.display = "none";
  } else {
    // Class exists on this day
    selectedDateKey = dateKey;
    selectedClassId = classId;
    const className = classId === "wed" ? "Wednesday Class" : classId === "sun" ? "Sunday Class" : "Pointe Shoe Class";
    document.getElementById("panelTitle").textContent = className + " · " + dateStr;
    document.getElementById("panelNoClass").style.display = "none";
    document.getElementById("panelWithClass").style.display = "block";
    document.getElementById("qrWrapper").style.display = "none";
    listenToStudents(dateKey);
  }

  openPanel();
  renderCalendar();
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
// PANEL
// =====================
const panel = document.getElementById("checkinPanel");
const panelContent = document.querySelector(".panel-content");

function openPanel() {
  panelContent.style.transition = "none";
  panelContent.style.transform = "translateX(-50%) translateY(100%)";
  panelContent.offsetHeight;
  panel.classList.add("active");
  requestAnimationFrame(() => {
    panelContent.style.transition = "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)";
    panelContent.style.transform = "translateX(-50%) translateY(0)";
  });
}

function closePanel() {
  panelContent.style.transition = "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)";
  panelContent.style.transform = "translateX(-50%) translateY(100%)";
  setTimeout(() => panel.classList.remove("active"), 300);
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
// ADD/REMOVE CLASS BUTTONS
// =====================
let lastClickedDate = null;

document.getElementById("addClassBtn").onclick = async () => {
  if (lastClickedDate) {
    const dateStr = dateToDateKey(lastClickedDate);
    await addCustomClass(dateStr);
  }
};

document.getElementById("removeClassBtn").onclick = async () => {
  if (selectedDateKey) {
    const dateStr = selectedDateKey.split("_")[0];
    await removeCustomClass(dateStr);
    closePanel();
    renderCalendar();
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
let startY = 0;
let currentY = 0;
let isDragging = false;

panelContent.addEventListener("touchstart", (e) => {
  startY = e.touches[0].clientY;
  currentY = startY;
  isDragging = true;
  panelContent.style.transition = "none";
}, { passive: false });

panelContent.addEventListener("touchmove", (e) => {
  if (!isDragging) return;
  e.preventDefault();
  currentY = e.touches[0].clientY;
  const diff = currentY - startY;
  if (diff > 0) panelContent.style.transform = `translateX(-50%) translateY(${diff * 0.9}px)`;
}, { passive: false });

panelContent.addEventListener("touchend", () => {
  if (!isDragging) return;
  isDragging = false;
  const diff = currentY - startY;
  panelContent.style.transition = "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)";
  if (diff > 80) closePanel();
  else panelContent.style.transform = "translateX(-50%) translateY(0)";
  startY = 0;
  currentY = 0;
});

// =====================
// INIT
// =====================
renderCalendar();
