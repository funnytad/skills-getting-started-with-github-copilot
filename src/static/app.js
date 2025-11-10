document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: derive initials from an email or name-like string
  const getInitials = (str) => {
    const name = (str || "").split("@")[0].replace(/[._-]+/g, " ").trim();
    const parts = name.split(" ").filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select so repeated fetches don't duplicate options
      activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML: show up to 5 participants with avatars, or muted text if none
        const participants = details.participants || [];
        let participantsHtml = "";
        if (participants.length === 0) {
          participantsHtml = `<p class="muted">No participants yet — be the first!</p>`;
        } else {
          const visible = participants.slice(0, 5);
          participantsHtml =
            `<ul class="participants-list">` +
            visible
              .map((p) => {
                // store encoded values in data attributes to avoid breaking HTML
                const encEmail = encodeURIComponent(p);
                const encActivity = encodeURIComponent(name);
                return `
                  <li class="participant-item" data-email="${encEmail}" data-activity="${encActivity}">
                    <span class="avatar">${getInitials(p)}</span>
                    <span class="participant-name">${p}</span>
                    <button class="participant-delete" title="Remove ${p}" aria-label="Remove ${p}">×</button>
                  </li>`;
              })
              .join("") +
            (participants.length > 5
              ? `<li class="participant-more">+${participants.length - 5} more</li>`
              : "") +
            `</ul>`;
        }

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <p><strong>Participants:</strong></p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so the new participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
  
  // Handle participant delete via event delegation
  activitiesList.addEventListener("click", async (ev) => {
    const btn = ev.target.closest && ev.target.closest(".participant-delete");
    if (!btn) return;

    const item = btn.closest(".participant-item");
    if (!item) return;

    const email = decodeURIComponent(item.dataset.email || "");
    const activity = decodeURIComponent(item.dataset.activity || "");

    if (!email || !activity) return;

    // Optimistically disable the button to prevent double-clicks
    btn.disabled = true;

    try {
      const res = await fetch(
        `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      const json = await res.json().catch(() => ({}));

      if (res.ok) {
        // Refresh the activities to reflect removal
        fetchActivities();
      } else {
        messageDiv.textContent = json.detail || json.message || "Failed to remove participant";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 5000);
        btn.disabled = false;
      }
    } catch (err) {
      console.error("Error removing participant:", err);
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
      btn.disabled = false;
    }
  });
});
