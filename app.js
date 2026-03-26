// 🔥 FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getDatabase, ref, onValue, off } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

// 🔥 FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCeOJs6sjZCCmvhAftzrUeUyZ6wB4oXHNw",
  authDomain: "evites-qr-code.firebaseapp.com",
  projectId: "evites-qr-code",
  storageBucket: "evites-qr-code.firebasestorage.app",
  messagingSenderId: "976591325172",
  appId: "1:976591325172:web:2ace676721ba1876bf5ba1",
  measurementId: "G-92Z6LNP9N3"
};

// 🔥 INIT FIREBASE
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// =====================
// CLASSES (QR LINKS FIXED)
// =====================

const classes = [
  {
    name: "Pointe Class",
    time: "Wednesday · 11:30",
    price: "€4,50",
    color: "#2bb673",
    link: "https://evites-qr-cod.netlify.app/student.html?class=wed",
    id: "wed"
  },
  {
    name: "Pointe Class",
    time: "Sunday · 12:45",
    price: "€4,50",
    color: "#6c63ff",
    link: "https://evites-qr-cod.netlify.app/student.html?class=sun",
    id: "sun"
  }
];

// =====================
// FIREBASE LISTENER
// =====================

let currentRef = null;

function listenToStudents(classId) {
  const list = document.getElementById("studentList");
  const countText = document.getElementById("checkinCount");

  if (currentRef) off(currentRef);

  const studentsRef = ref(db, "checkins/" + classId);
  currentRef = studentsRef;

  onValue(studentsRef, (snapshot) => {
    list.innerHTML = "";

    let count = 0;

    if (!snapshot.exists()) {
      countText.innerText = "0 students checked-in";
      return;
    }

    snapshot.forEach((child) => {
      const data = child.val();

      const li = document.createElement("li");

      // 🔥 show status if exists
      if (data.status) {
        li.innerText = data.name + " • " + data.status;
      } else {
        if (data.status === "redirecting") {
  li.innerText = data.name + " • unpaid";
} else if (data.status === "paid") {
  li.innerText = data.name + " • paid ✅";
} else {
  li.innerText = data.name;
}
      }

      list.appendChild(li);
      count++;
    });

    countText.innerText = count + " students checked-in";
  });
}

// =====================
// UI ELEMENTS
// =====================

const container = document.getElementById("classes");
const panel = document.getElementById("checkinPanel");
const panelContent = document.querySelector(".panel-content");

let currentClassId = "";

// =====================
// CREATE CLASS CARDS
// =====================

classes.forEach((cls) => {

  const card = document.createElement("div");
  card.className = "card";
  card.style.borderLeftColor = cls.color;

  card.innerHTML = `
    <div class="title">${cls.name}</div>
    <div class="time">${cls.time}</div>
    <div class="price">${cls.price}</div>
  `;

  card.onclick = () => {
    document.querySelectorAll(".card").forEach(c => c.classList.remove("active"));
    card.classList.add("active");

    const qrContainer = document.querySelector(".qr-container");
    qrContainer.classList.add("active");
    qrContainer.innerHTML = "";

    const canvas = document.createElement("canvas");
    qrContainer.appendChild(canvas);

    QRCode.toCanvas(canvas, cls.link, {
      width: 280,
      margin: 2
    });

    document.getElementById("status").innerText = "Scan to pay";
    document.getElementById("selectedClass").innerText =
      cls.name + " – " + cls.time;

    currentClassId = cls.id;
    listenToStudents(currentClassId);
  };

  container.appendChild(card);
});

// =====================
// OPEN PANEL (SMOOTH)
// =====================

document.getElementById("openCheckin").onclick = () => {

  panelContent.style.transition = "none";
  panelContent.style.transform = "translateX(-50%) translateY(100%)";

  panelContent.offsetHeight;

  panel.classList.add("active");

  requestAnimationFrame(() => {
    panelContent.style.transition =
      "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)";
    panelContent.style.transform =
      "translateX(-50%) translateY(0)";
  });
};

// =====================
// SWIPE DOWN (IPHONE STYLE)
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
  let diff = currentY - startY;

  if (diff > 0) {
    let resistance = diff * 0.9;

    panelContent.style.transform =
      `translateX(-50%) translateY(${resistance}px)`;
  }
}, { passive: false });

panelContent.addEventListener("touchend", () => {
  if (!isDragging) return;

  isDragging = false;

  let diff = currentY - startY;

  panelContent.style.transition =
    "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)";

  if (diff > 80) {
    panelContent.style.transform =
      "translateX(-50%) translateY(100%)";

    setTimeout(() => {
      panel.classList.remove("active");
    }, 300);
  } else {
    panelContent.style.transform =
      "translateX(-50%) translateY(0)";
  }

  startY = 0;
  currentY = 0;
});