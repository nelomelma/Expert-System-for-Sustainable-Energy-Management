let consumptionChart;
let impactChart;
let selectedRating = 0;

// ---- DARK MODE ----
function toggleDark() {
  document.body.classList.toggle("dark");
}

// ---- START SYSTEM ----
function startSystem() {
  document.getElementById("homePage").style.display = "none";
  document.getElementById("advisor").style.display = "block";
  updateAverageRating();
}

// ---- FUZZY LOGIC ----
function fuzzyScore(consumption) {
  let low = 0;
  let medium = 0;
  let high = 0;

  if (consumption <= 20) {
    low = 1;
  } else if (consumption > 20 && consumption < 40) {
    low = (40 - consumption) / 20;
  }

  if (consumption >= 20 && consumption <= 50) {
    medium = 1 - Math.abs(consumption - 35) / 15;
  }

  if (consumption >= 40 && consumption < 70) {
    high = (consumption - 40) / 30;
  } else if (consumption >= 70) {
    high = 1;
  }

  return {
    low: Math.max(0, low).toFixed(2),
    medium: Math.max(0, medium).toFixed(2),
    high: Math.max(0, high).toFixed(2)
  };
}

// ---- ENERGY SCORE ----
function calculateScore(source, c, timeVal, build, app, occ) {
  let score = 100;

  if (c > 50) score -= 25;
  else if (c > 30) score -= 15;

  if (source === "grid") score -= 15;
  if (timeVal === "evening") score -= 10;
  if (app === "all") score -= 10;
  if (app === "heater" || app === "ac") score -= 8;
  if (occ > 5) score -= 10;
  if (build === "industry" || build === "hospital") score -= 10;

  if (score < 0) score = 0;
  return score;
}

function getPriorityBadge(priority) {
  if (priority === "High") {
    return `<span class="badge badge-high">High Priority</span>`;
  } else if (priority === "Medium") {
    return `<span class="badge badge-medium">Medium Priority</span>`;
  }
  return `<span class="badge badge-low">Low Priority</span>`;
}
function getRenewableSuggestion(source, c, costVal) {
  let solarSize = Math.max(1, Math.ceil(c / 30)); // simple estimated kW size
  let estimatedInstallCost = solarSize * 900; // simple estimate
  let estimatedMonthlySolarSavings = c * costVal * 0.35;
  let paybackMonths = estimatedMonthlySolarSavings > 0
    ? estimatedInstallCost / estimatedMonthlySolarSavings
    : 0;

  let suggestionText = "";

  if (source === "grid") {
    suggestionText = "Your current profile suggests that partial solar adoption could reduce dependence on grid electricity.";
  } else if (source === "hybrid") {
    suggestionText = "Your hybrid setup could be improved by increasing renewable contribution, especially solar during daytime.";
  } else if (source === "solar") {
    suggestionText = "You are already using solar energy. The next step is to maximize daytime appliance usage and improve storage if possible.";
  } else if (source === "wind") {
    suggestionText = "You may combine wind with solar for a more balanced renewable energy mix across different weather conditions.";
  }

  return {
    solarSize,
    estimatedInstallCost,
    estimatedMonthlySolarSavings,
    paybackMonths,
    suggestionText
  };
}

function getPredictions(c, costVal, savings) {
  const currentMonthlyCost = c * costVal;
  const optimizedMonthlyCost = Math.max(0, currentMonthlyCost - savings);
  const yearlyCurrentCost = currentMonthlyCost * 12;
  const yearlyOptimizedCost = optimizedMonthlyCost * 12;
  const yearlySavings = savings * 12;

  return {
    currentMonthlyCost,
    optimizedMonthlyCost,
    yearlyCurrentCost,
    yearlyOptimizedCost,
    yearlySavings
  };
}

// ---- GET ADVICE ----
function getAdvice() {
    
  const source = document.getElementById("energySource").value;
  const c = Number(document.getElementById("consumption").value);
  const timeVal = document.getElementById("time").value;
  const build = document.getElementById("building").value;
  const app = document.getElementById("appliances").value;
  const occ = Number(document.getElementById("occupants").value);
  const costVal = Number(document.getElementById("cost").value);

  if (isNaN(c) || isNaN(occ) || isNaN(costVal) || c <= 0 || occ <= 0 || costVal <= 0) {
    alert("Please enter valid positive numbers for consumption, occupants, and cost.");
    return;
  }

  if (c > 1000) {
    alert("Consumption value seems too high. Please check your input.");
    return;
  }

  document.getElementById("loading").style.display = "block";
  document.getElementById("result").style.display = "none";

  setTimeout(() => {
    let advice = [];
    let reasons = [];
    let fired = 0;
    let savings = 0;
    let co2 = 0;

    if (source === "grid" && c > 30) {
      advice.push({ text: "Switch partially to renewable energy sources", priority: "High" });
      reasons.push("The system detected high electricity use from the grid.");
      fired++;
      savings += 0.15 * c * costVal;
      co2 += 0.7 * c;
    }

    if (app === "ac" && timeVal === "evening") {
      advice.push({ text: "Shift AC usage to off-peak hours", priority: "High" });
      reasons.push("Air conditioner usage during evening peak hours increases energy cost.");
      fired++;
      savings += 0.08 * c * costVal;
      co2 += 0.2 * c;
    }

    if (source === "solar") {
      advice.push({ text: "Maximize appliance use during daylight hours", priority: "Medium" });
      reasons.push("Solar power is most beneficial when used during sunlight hours.");
      fired++;
    }

    if (build === "industry" && c > 50) {
      advice.push({ text: "Conduct an energy audit and introduce automation", priority: "High" });
      reasons.push("Industrial settings with high consumption benefit from energy audits.");
      fired++;
      savings += 0.12 * c * costVal;
      co2 += 0.25 * c;
    }

    if (occ > 5 && build === "home") {
      advice.push({ text: "Install smart lighting schedules for shared spaces", priority: "Medium" });
      reasons.push("A high number of occupants usually increases lighting and appliance demand.");
      fired++;
    }

    if (app === "heater") {
      advice.push({ text: "Lower heating by 1–2°C to reduce energy waste", priority: "Medium" });
      reasons.push("Heaters consume more electricity when temperature settings are high.");
      fired++;
      savings += 0.07 * c * costVal;
      co2 += 0.15 * c;
    }

    if (source === "hybrid") {
      advice.push({ text: "Prioritize renewable usage whenever possible", priority: "Medium" });
      reasons.push("Hybrid systems are more efficient when renewable energy is used first.");
      fired++;
    }

    if (app === "lights" && timeVal === "afternoon") {
      advice.push({ text: "Use natural daylight and reduce unnecessary lighting", priority: "Low" });
      reasons.push("Afternoon daylight can reduce the need for artificial lights.");
      fired++;
      savings += 0.03 * c * costVal;
    }

    if (app === "fridge") {
      advice.push({ text: "Optimize fridge temperature and reduce door opening frequency", priority: "Low" });
      reasons.push("Refrigerators work harder when opened frequently or set too cold.");
      fired++;
    }

    if (build === "office" && app === "computers") {
      advice.push({ text: "Enable sleep mode on office computers and monitors", priority: "Medium" });
      reasons.push("Office computers waste energy when left active for long periods.");
      fired++;
      savings += 0.04 * c * costVal;
    }

    if (build === "school" && app === "lights") {
      advice.push({ text: "Use classroom lighting schedules or motion sensors", priority: "Medium" });
      reasons.push("School lighting can be reduced in unoccupied classrooms.");
      fired++;
    }

    if (build === "hospital" && c > 40) {
      advice.push({ text: "Review non-critical equipment scheduling to reduce peak load", priority: "High" });
      reasons.push("Hospitals consume significant energy and benefit from careful load management.");
      fired++;
    }

    if (build === "university" && app === "lights") {
      advice.push({ text: "Reduce corridor and classroom lighting during low-traffic periods", priority: "Medium" });
      reasons.push("University facilities often have lighting waste outside peak usage hours.");
      fired++;
    }

    if (build === "business" && app === "all") {
      advice.push({ text: "Adopt a daily shutdown checklist for all appliances", priority: "High" });
      reasons.push("Small businesses often leave multiple devices running after hours.");
      fired++;
      savings += 0.05 * c * costVal;
    }

    if (build === "apartment" && occ >= 3 && app === "ac") {
      advice.push({ text: "Use AC zoning and close unused rooms", priority: "Medium" });
      reasons.push("Cooling only occupied spaces can reduce energy usage in apartments.");
      fired++;
    }

    if (timeVal === "night" && source === "grid") {
      advice.push({ text: "Shift flexible appliance usage to cheaper off-peak night periods if tariff allows", priority: "Low" });
      reasons.push("Night-time usage can be optimized depending on tariff structure.");
      fired++;
    }

    if (app === "machines" && build === "industry") {
      advice.push({ text: "Balance machine usage across time periods to reduce peak demand", priority: "High" });
      reasons.push("Industrial machine loads can create costly peak demand spikes.");
      fired++;
      savings += 0.06 * c * costVal;
    }

    if (source === "wind") {
      advice.push({ text: "Use storage or plan appliance usage around available wind supply", priority: "Low" });
      reasons.push("Wind energy availability may vary, so planned use can improve efficiency.");
      fired++;
    }

    if (advice.length === 0) {
      advice.push({ text: "System detected relatively efficient usage. Maintain current practices.", priority: "Low" });
      reasons.push("No major inefficiency was detected under the current input conditions.");
    }

    const score = calculateScore(source, c, timeVal, build, app, occ);
    const fuzzy = fuzzyScore(c);
    const optimizedConsumption = Math.max(0, c - (costVal > 0 ? savings / costVal : 0));
    const renewable = getRenewableSuggestion(source, c, costVal);
    const prediction = getPredictions(c, costVal, savings);
    const topAdvice = advice[0].text;
    const reasoning = `The inference engine fired ${fired} rule(s) after analysing energy source, consumption, usage time, building type, appliance use, occupants, and cost.`;

    let level = "";
    if (score > 80) level = "Excellent";
    else if (score > 50) level = "Moderate";
    else level = "Poor";

    let ecoMessage = "";
    if (co2 > 20) {
      ecoMessage = "High environmental impact. Action is strongly recommended.";
    } else {
      ecoMessage = "Good job. Your environmental impact is relatively under control.";
    }

    document.getElementById("result").style.display = "block";
    document.getElementById("result").innerHTML = `      <div class="system-panel">
        <h4>Alternative Energy Options</h4>
        <p><b>Renewable Suggestion:</b> ${renewable.suggestionText}</p>
        <p><b>Estimated Solar Panel Size:</b> ${renewable.solarSize} kW</p>
        <p><b>Estimated Installation Cost:</b> $${renewable.estimatedInstallCost.toFixed(2)}</p>
        <p><b>Estimated Monthly Solar Savings:</b> $${renewable.estimatedMonthlySolarSavings.toFixed(2)}</p>
        <p><b>Estimated Payback Period:</b> ${renewable.paybackMonths.toFixed(1)} months</p>
      </div>

      <div class="system-panel">
        <h4>Monthly and Yearly Prediction</h4>
        <p><b>Current Monthly Cost:</b> $${prediction.currentMonthlyCost.toFixed(2)}</p>
        <p><b>Optimized Monthly Cost:</b> $${prediction.optimizedMonthlyCost.toFixed(2)}</p>
        <p><b>Projected Yearly Cost (Current Usage):</b> $${prediction.yearlyCurrentCost.toFixed(2)}</p>
        <p><b>Projected Yearly Cost (After Improvement):</b> $${prediction.yearlyOptimizedCost.toFixed(2)}</p>
        <p><b>Projected Yearly Savings:</b> $${prediction.yearlySavings.toFixed(2)}</p>
      </div>     <h3>Recommendations</h3>

      <div class="input-summary">
        <h4>Your Input Summary</h4>
        <p>
          <b>Source:</b> ${source},
          <b>Consumption:</b> ${c} kWh,
          <b>Time:</b> ${timeVal},
          <b>Building:</b> ${build},
          <b>Appliance:</b> ${app},
          <b>Occupants:</b> ${occ},
          <b>Cost:</b> $${costVal}
        </p>
      </div>

      <p><b>Best Recommendation:</b> ${topAdvice}</p>
      <div class="score">Energy Efficiency Score: ${score}/100</div>
      <p><b>Energy Level:</b> ${level}</p>
      <p><b>Total Rules Triggered:</b> ${fired}</p>

      <h4>Detailed Recommendations</h4>
      <ul>
        ${advice.map(item => `<li>${item.text} ${getPriorityBadge(item.priority)}</li>`).join("")}
      </ul>

      <h4>Why this advice was given</h4>
      <ul>
        ${reasons.map(r => `<li>${r}</li>`).join("")}
      </ul>

      <div class="system-panel">
        <p><b>AI Reasoning:</b> ${reasoning}</p>
        <p><b>Estimated Savings:</b> $${savings.toFixed(2)}</p>
        <p><b>Estimated CO₂ Reduction:</b> ${co2.toFixed(2)} kg/day</p>
      </div>

      <div class="eco-message">
        <p><b>Environmental Insight:</b> ${ecoMessage}</p>
      </div>

      <h4>Fuzzy Analysis</h4>
      <p>Low: ${fuzzy.low}, Medium: ${fuzzy.medium}, High: ${fuzzy.high}</p>

      <div class="how-it-works">
        <h4>How the system works</h4>
        <p>
          This system uses rule-based reasoning together with fuzzy logic.
          Based on your inputs, multiple rules are triggered to generate recommendations.
          The system also estimates savings and environmental impact using predefined logic.
        </p>
      </div>
    `;

    let history = JSON.parse(localStorage.getItem("energyData")) || [];
    history.push({
      date: new Date().toLocaleString(),
      source,
      consumption: c,
      timeVal,
      building: build,
      appliance: app,
      occupants: occ,
      cost: costVal,
      score,
      advice: advice.map(a => a.text),
      savings: savings.toFixed(2),
      co2: co2.toFixed(2)
    });
    localStorage.setItem("energyData", JSON.stringify(history));

    if (consumptionChart) consumptionChart.destroy();
    consumptionChart = new Chart(document.getElementById("consumptionChart"), {
      type: "bar",
      data: {
        labels: ["Current Consumption", "Optimized Consumption"],
        datasets: [
          {
            label: "Energy (kWh)",
            data: [c, optimizedConsumption],
            backgroundColor: ["#1b8f6a", "#2fbf91"],
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Energy Usage Before and After Optimization"
          },
          legend: {
            display: true
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    if (impactChart) impactChart.destroy();
    impactChart = new Chart(document.getElementById("impactChart"), {
      type: "bar",
      data: {
        labels: ["Estimated Savings ($)", "CO₂ Reduction (kg/day)"],
        datasets: [
          {
            label: "Impact",
            data: [Number(savings.toFixed(2)), Number(co2.toFixed(2))],
            backgroundColor: ["#89d8b5", "#b7ead3"],
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Financial and Environmental Impact"
          },
          legend: {
            display: true
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });

    document.getElementById("loading").style.display = "none";
  }, 1000);
}

// ---- SHOW HISTORY ----
function showHistory() {
  const data = JSON.parse(localStorage.getItem("energyData")) || [];
  const historyBox = document.getElementById("historyBox");
  historyBox.style.display = "block";

  if (data.length === 0) {
    historyBox.innerHTML = "<h3>Past Results</h3><p>No history found.</p>";
    return;
  }

  historyBox.innerHTML = `
    <h3>Past Results</h3>
    ${data.map((item, index) => `
      <div class="history-item">
        <p><b>Record ${index + 1}</b></p>
        <p><b>Date:</b> ${item.date}</p>
        <p><b>Energy Source:</b> ${item.source}</p>
        <p><b>Consumption:</b> ${item.consumption} kWh</p>
        <p><b>Building:</b> ${item.building}</p>
        <p><b>Appliance:</b> ${item.appliance}</p>
        <p><b>Occupants:</b> ${item.occupants}</p>
        <p><b>Score:</b> ${item.score}/100</p>
        <p><b>Estimated Savings:</b> $${item.savings}</p>
        <p><b>Estimated CO₂ Reduction:</b> ${item.co2} kg/day</p>
        <p><b>Advice:</b> ${item.advice.join(", ")}</p>
      </div>
    `).join("")}
  `;
}

// ---- RESET FORM ----
function resetForm() {
  document.getElementById("energySource").value = "grid";
  document.getElementById("consumption").value = "";
  document.getElementById("time").value = "morning";
  document.getElementById("building").value = "home";
  document.getElementById("appliances").value = "ac";
  document.getElementById("occupants").value = "";
  document.getElementById("cost").value = "";
  document.getElementById("result").innerHTML = "";
  document.getElementById("result").style.display = "none";
  document.getElementById("historyBox").style.display = "none";
  document.getElementById("loading").style.display = "none";

  if (consumptionChart) {
    consumptionChart.destroy();
    consumptionChart = null;
  }

  if (impactChart) {
    impactChart.destroy();
    impactChart = null;
  }
}

// ---- SAVE PDF ----
async function savePDF() {
  let resultText = document.getElementById("result").innerText.trim();

resultText = resultText
  .replace(/₂/g, "2")
  .replace(/–/g, "-")
  .replace(/°/g, " degrees ")
  .replace(/≥/g, ">=")
  .replace(/≤/g, "<=");

  if (!resultText) {
    alert("Please generate a recommendation before saving the PDF.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const source = document.getElementById("energySource").value;
  const consumption = document.getElementById("consumption").value;
  const timeVal = document.getElementById("time").value;
  const building = document.getElementById("building").value;
  const appliance = document.getElementById("appliances").value;
  const occupants = document.getElementById("occupants").value;
  const cost = document.getElementById("cost").value;

  doc.setFontSize(16);
  doc.text("Energy Expert Report", 20, 20);

  doc.setFontSize(11);
  let y = 35;

  const lines = [
    `Date: ${new Date().toLocaleString()}`,
    `Energy Source: ${source}`,
    `Consumption: ${consumption} kWh`,
    `Time of Usage: ${timeVal}`,
    `Building Type: ${building}`,
    `Appliance: ${appliance}`,
    `Occupants: ${occupants}`,
    `Cost per kWh: $${cost}`,
    "",
    "System Output:",
    ...resultText.split("\n")
  ];

  lines.forEach(line => {
    const splitText = doc.splitTextToSize(line, 170);
    doc.text(splitText, 20, y);
    y += splitText.length * 7;

    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save("energy_report.pdf");
}

// ---- RATING SYSTEM ----
const stars = document.querySelectorAll(".star");

stars.forEach(star => {
  star.addEventListener("click", function () {
    selectedRating = Number(this.getAttribute("data-value"));
    updateStars(selectedRating);
  });
});

function updateStars(rating) {
  stars.forEach(star => {
    const value = Number(star.getAttribute("data-value"));
    if (value <= rating) {
      star.classList.remove("fa-regular");
      star.classList.add("fa-solid");
    } else {
      star.classList.remove("fa-solid");
      star.classList.add("fa-regular");
    }
  });
}

function updateAverageRating() {
  let ratings = JSON.parse(localStorage.getItem("ratings")) || [];
  if (ratings.length === 0) {
    document.getElementById("avgRating").innerText = "Average Rating: 0 / 5";
    return;
  }

  let avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  document.getElementById("avgRating").innerText = `Average Rating: ${avg.toFixed(1)} / 5`;
}

// ---- SAVE FEEDBACK ----
function saveFeedback() {
  const userName = document.getElementById("userName").value.trim();
  const feedbackMessage = document.getElementById("feedbackMessage").value.trim();
  const feedbackList = document.getElementById("feedbackList");

  if (!userName || !feedbackMessage || selectedRating === 0) {
    alert("Please enter your name, feedback, and select a rating.");
    return;
  }

  const starText = "⭐".repeat(selectedRating);

  const feedbackDiv = document.createElement("div");
  feedbackDiv.classList.add("feedback-item");
  feedbackDiv.innerHTML = `
    <p><strong>${userName}</strong> - ${starText}</p>
    <p>${feedbackMessage}</p>
  `;

  feedbackList.appendChild(feedbackDiv);

  let ratings = JSON.parse(localStorage.getItem("ratings")) || [];
  ratings.push(Number(selectedRating));
  localStorage.setItem("ratings", JSON.stringify(ratings));
  updateAverageRating();

  document.getElementById("userName").value = "";
  document.getElementById("feedbackMessage").value = "";
  selectedRating = 0;
  updateStars(0);
}

// ---- INITIAL LOAD ----
updateAverageRating();