const GOOGLE_APPS_SCRIPT_URL = "";
const ADMIN_PASSWORD = "EmmaPaula2026";
const EVENT_DATE = new Date("2026-07-03T19:00:00-06:00");
const STORAGE_KEY = "emma-paula-rsvp";

const intro = document.querySelector("#intro");
const invitation = document.querySelector("#invitation");
const envelope = document.querySelector("#envelope");
const openInvite = document.querySelector("#openInvite");
const musicToggle = document.querySelector("#musicToggle");
const form = document.querySelector("#rsvpForm");
const thanksMessage = document.querySelector("#thanksMessage");
const confettiCanvas = document.querySelector("#confettiCanvas");
const ctx = confettiCanvas.getContext("2d");

const backgroundMusic = new Audio("alphabet-adventure_88135.mp3");
backgroundMusic.loop = true;
backgroundMusic.preload = "auto";
backgroundMusic.volume = 0.65;

let musicOn = true;
let confetti = [];

function sizeCanvas() {
  confettiCanvas.width = window.innerWidth * window.devicePixelRatio;
  confettiCanvas.height = window.innerHeight * window.devicePixelRatio;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

function getLocalGuests() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalGuest(guest) {
  const guests = getLocalGuests();
  guests.push(guest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(guests));
}

function startMusic() {
  if (!musicOn) return;
  backgroundMusic.play().catch(() => {
    musicToggle.innerHTML = '<span class="button-icon">♪</span>Tocar música';
  });
}

function stopMusic() {
  backgroundMusic.pause();
}

function burstConfetti(amount = 160) {
  const colors = ["#ff75bd", "#ffe28c", "#7ee6c6", "#80dfff", "#b99cff", "#ffffff"];
  for (let i = 0; i < amount; i += 1) {
    confetti.push({
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.28,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -9 - 2,
      gravity: 0.22 + Math.random() * 0.08,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.35,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 130 + Math.random() * 60,
    });
  }
}

function renderConfetti() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  confetti = confetti.filter((piece) => piece.life > 0 && piece.y < window.innerHeight + 40);
  confetti.forEach((piece) => {
    piece.x += piece.vx;
    piece.y += piece.vy;
    piece.vy += piece.gravity;
    piece.rotation += piece.spin;
    piece.life -= 1;

    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.rotation);
    ctx.fillStyle = piece.color;
    ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.56);
    ctx.restore();
  });
  requestAnimationFrame(renderConfetti);
}

function openInvitation() {
  envelope.classList.add("is-open");
  startMusic();
  burstConfetti(110);
  setTimeout(() => {
    intro.classList.add("is-hidden");
    invitation.classList.add("is-visible");
    invitation.removeAttribute("aria-hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 950);
}

function updateCountdown() {
  const diff = Math.max(0, EVENT_DATE.getTime() - Date.now());
  const seconds = Math.floor(diff / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  document.querySelector("#days").textContent = String(days).padStart(2, "0");
  document.querySelector("#hours").textContent = String(hours).padStart(2, "0");
  document.querySelector("#minutes").textContent = String(minutes).padStart(2, "0");
  document.querySelector("#seconds").textContent = String(remainingSeconds).padStart(2, "0");
}

function normalizeGuest(formData) {
  return {
    fechaRegistro: new Date().toISOString(),
    nombre: formData.get("nombre").trim(),
    adultos: Number(formData.get("adultos") || 0),
    ninos: Number(formData.get("ninos") || 0),
    comentarios: formData.get("comentarios").trim(),
  };
}

async function sendToGoogleSheets(guest) {
  if (!GOOGLE_APPS_SCRIPT_URL) return;
  await fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(guest),
  });
}

function renderAdmin(guests) {
  const totalAdults = guests.reduce((sum, guest) => sum + Number(guest.adultos || 0), 0);
  const totalKids = guests.reduce((sum, guest) => sum + Number(guest.ninos || 0), 0);
  document.querySelector("#totalGuests").textContent = guests.length;
  document.querySelector("#totalPeople").textContent = totalAdults + totalKids;
  document.querySelector("#totalAdults").textContent = totalAdults;
  document.querySelector("#totalKids").textContent = totalKids;

  document.querySelector("#guestRows").innerHTML = guests
    .map(
      (guest) => `
        <tr>
          <td>${escapeHtml(guest.nombre || "")}</td>
          <td>${Number(guest.adultos || 0)}</td>
          <td>${Number(guest.ninos || 0)}</td>
          <td>${escapeHtml(guest.comentarios || "")}</td>
        </tr>
      `,
    )
    .join("");
}

function loadGuestsFromScript() {
  return new Promise((resolve) => {
    if (!GOOGLE_APPS_SCRIPT_URL) {
      resolve(getLocalGuests());
      return;
    }

    const callbackName = `emmaPaulaGuests${Date.now()}`;
    const script = document.createElement("script");
    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (payload) => {
      cleanup();
      resolve(Array.isArray(payload.guests) ? payload.guests : []);
    };

    script.onerror = () => {
      cleanup();
      resolve(getLocalGuests());
    };

    script.src = `${GOOGLE_APPS_SCRIPT_URL}?callback=${callbackName}`;
    document.body.appendChild(script);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return entities[char];
  });
}

openInvite.addEventListener("click", openInvitation);

musicToggle.addEventListener("click", () => {
  musicOn = !musicOn;
  musicToggle.setAttribute("aria-pressed", String(musicOn));
  musicToggle.classList.toggle("is-off", !musicOn);
  musicToggle.innerHTML = `<span class="button-icon">${musicOn ? "♪" : "∅"}</span>${musicOn ? "Música" : "Silencio"}`;
  if (musicOn) startMusic();
  else stopMusic();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = form.querySelector("button[type='submit']");
  const guest = normalizeGuest(new FormData(form));
  submitButton.disabled = true;
  submitButton.textContent = "Confirmando...";

  try {
    saveLocalGuest(guest);
    await sendToGoogleSheets(guest);
    burstConfetti(180);
    thanksMessage.textContent = "¡Gracias! Tu asistencia quedó confirmada con mucha magia.";
    form.reset();
    form.adultos.value = 1;
    form.ninos.value = 0;
  } catch {
    thanksMessage.textContent = "Tu confirmación se guardó en este dispositivo. Revisa la conexión de Google Sheets.";
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<span class="button-icon">★</span>Confirmar asistencia';
  }
});

document.querySelector("#adminAccess").addEventListener("click", async () => {
  const password = document.querySelector("#adminPassword").value;
  if (password !== ADMIN_PASSWORD) {
    alert("Contraseña incorrecta");
    return;
  }
  document.querySelector("#adminLogin").hidden = true;
  document.querySelector("#adminContent").hidden = false;
  renderAdmin(await loadGuestsFromScript());
});

window.addEventListener("resize", sizeCanvas);
sizeCanvas();
renderConfetti();
updateCountdown();
setInterval(updateCountdown, 1000);
