import { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

function App() {
  const [page, setPage] = useState("home");

  const [user, setUser] = useState({
    name: "",
    age: "",
    sex: "",
    height: "",
    weight: "",
    email: "",
    phone: "",
    activityLevel: "",
    goal: "",
    activities: [],
  });

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const [activityCompleted, setActivityCompleted] = useState(false);
  const [activeDays, setActiveDays] = useState(3);
  const [streak, setStreak] = useState(5);
  const [goalCompletion, setGoalCompletion] = useState(82);
  const [recommendation, setRecommendation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  /* =========================
     USER DATA
  ========================= */

  const updateUser = (field, value) => {
    setUser((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleActivity = (activity) => {
    setUser((prev) => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter((item) => item !== activity)
        : [...prev.activities, activity],
    }));
  };

  /* =========================
     RECOMMENDATION ENGINE
  ========================= */

  const getRecommendation = () => {
    const { activityLevel, goal, activities } = user;

    if (
      goal === "Sports Performance" &&
      activities.includes("Cricket")
    ) {
      return {
        title: "Cricket Fitness Session",
        type: "Cricket",
        duration: "30 min",
        difficulty:
          activityLevel === "Highly Active"
            ? "Advanced"
            : "Moderate",
      };
    }

    if (
      goal === "Sports Performance" &&
      activities.includes("Football")
    ) {
      return {
        title: "Football Conditioning Session",
        type: "Football",
        duration: "30 min",
        difficulty:
          activityLevel === "Highly Active"
            ? "Advanced"
            : "Moderate",
      };
    }

    if (
      goal === "Build Strength" &&
      activities.includes("Gym")
    ) {
      return {
        title: "Full-Body Strength Session",
        type: "Gym",
        duration: "30 min",
        difficulty:
          activityLevel === "Beginner"
            ? "Easy"
            : "Moderate",
      };
    }

    if (
      goal === "Improve Endurance" &&
      activities.includes("Cycling")
    ) {
      return {
        title: "30-Minute Cycling Session",
        type: "Cycling",
        duration: "30 min",
        difficulty:
          activityLevel === "Beginner"
            ? "Easy"
            : "Moderate",
      };
    }

    if (activities.includes("Running")) {
      return {
        title: "20-Minute Run / Walk",
        type: "Running",
        duration: "20 min",
        difficulty:
          activityLevel === "Beginner"
            ? "Easy"
            : "Moderate",
      };
    }

    if (activities.includes("Walking")) {
      return {
        title: "30-Minute Brisk Walk",
        type: "Walking",
        duration: "30 min",
        difficulty: "Easy",
      };
    }

    if (activities.includes("Cycling")) {
      return {
        title: "30-Minute Cycling Session",
        type: "Cycling",
        duration: "30 min",
        difficulty: "Easy",
      };
    }

    if (activities.includes("Gym")) {
      return {
        title: "Full-Body Starter Workout",
        type: "Gym",
        duration: "25 min",
        difficulty: "Easy",
      };
    }

    if (activities.includes("Cricket")) {
      return {
        title: "Cricket Fitness Session",
        type: "Cricket",
        duration: "25 min",
        difficulty: "Easy",
      };
    }

    return {
      title: "20-Minute Beginner Activity",
      type: "General Fitness",
      duration: "20 min",
      difficulty: "Easy",
    };
  };

  const fallbackRecommendation = getRecommendation();

  /* =========================
     FORM VALIDATION
  ========================= */

  const goToOTP = () => {
    setError("");

    if (
      !user.name ||
      !user.age ||
      !user.sex ||
      !user.height ||
      !user.weight ||
      !user.email ||
      !user.phone
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (user.phone.length < 10) {
      setError("Please enter a valid mobile number.");
      return;
    }

    setPage("otp");
  };

  const verifyOTP = () => {
    if (otp !== "123456") {
      setError("Invalid OTP. Use 123456 for this demo.");
      return;
    }

    setError("");
    setPage("assessment");
  };

  const saveProfile = async (extra = {}) => {
    const userId = user.phone.replace(/\D/g, "");
    const payload = {
      ...user,
      activeDays,
      streak,
      goalCompletion,
      ...extra,
      updatedAt: serverTimestamp(),
    };

    localStorage.setItem("aura_user", JSON.stringify({ ...payload, updatedAt: new Date().toISOString() }));

    try {
      if (userId) {
        await setDoc(doc(db, "users", userId), payload, { merge: true });
      }
    } catch (err) {
      console.warn("Firestore save skipped:", err?.message || err);
    }
  };

  const requestAIRecommendation = async ({ previousActivity = "None", previousActivityType = "None", activeDaysOverride = activeDays, streakOverride = streak, goalCompletionOverride = goalCompletion } = {}) => {
    setAiLoading(true);
    setAiError("");

    try {
      const response = await fetch("http://localhost:5000/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: user.age,
          sex: user.sex,
          activityLevel: user.activityLevel,
          goal: user.goal,
          activities: user.activities,
          activeDays: activeDaysOverride,
          streak: streakOverride,
          goalCompletion: goalCompletionOverride,
          previousActivity,
          previousActivityType,
        }),
      });

      if (!response.ok) throw new Error(`AI server returned ${response.status}`);

      const data = await response.json();
      if (!data?.title || !data?.duration || !data?.difficulty) throw new Error("Invalid AI recommendation");

      setRecommendation(data);
      return data;
    } catch (err) {
      console.warn("AI recommendation unavailable:", err?.message || err);
      setAiError("AI is temporarily unavailable. Showing AURA's fallback recommendation.");
      const fallback = fallbackRecommendation;
      setRecommendation(fallback);
      return fallback;
    } finally {
      setAiLoading(false);
    }
  };

  const finishAssessment = async () => {
    if (!user.activityLevel || !user.goal || user.activities.length === 0) {
      setError("Please select all required options.");
      return;
    }

    setError("");
    await saveProfile();
    setRecommendation(fallbackRecommendation);
    setPage("profile");

    requestAIRecommendation();
  };

  const completeActivity = async () => {
    const nextActiveDays = activeDays + 1;
    const nextStreak = streak + 1;
    const nextGoalCompletion = Math.min(goalCompletion + 6, 100);
    const previous = recommendation || fallbackRecommendation;

    setActiveDays(nextActiveDays);
    setStreak(nextStreak);
    setGoalCompletion(nextGoalCompletion);
    setActivityCompleted(true);
    setError("");

    localStorage.setItem("aura_stats", JSON.stringify({
      activeDays: nextActiveDays,
      streak: nextStreak,
      goalCompletion: nextGoalCompletion,
    }));

    try {
      const userId = user.phone.replace(/\D/g, "");
      if (userId) {
        await setDoc(doc(db, "users", userId), {
          activeDays: nextActiveDays,
          streak: nextStreak,
          goalCompletion: nextGoalCompletion,
          lastActivity: {
            title: previous.title,
            type: previous.type,
            duration: previous.duration,
            completedAt: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      console.warn("Activity Firestore save skipped:", err?.message || err);
    }

    const next = await requestAIRecommendation({
      previousActivity: previous.title,
      previousActivityType: previous.type,
      activeDaysOverride: nextActiveDays,
      streakOverride: nextStreak,
      goalCompletionOverride: nextGoalCompletion,
    });

    await saveProfile({
      activeDays: nextActiveDays,
      streak: nextStreak,
      goalCompletion: nextGoalCompletion,
      nextRecommendation: next,
    });
  };

  const currentRecommendation = recommendation || fallbackRecommendation;

  /* =========================
     HOME
  ========================= */

  if (page === "home") {
    return (
      <div className="page">
        <nav className="navbar">
          <div className="logo">AURA</div>

          <div className="nav-links">
            <span>How It Works</span>
            <span>Explore</span>

            <button
              onClick={() => setPage("profileForm")}
            >
              Sign In
            </button>
          </div>
        </nav>

        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              PERSONALIZED FITNESS ECOSYSTEM
            </div>

            <h1>
              MOVE.
              <br />
              CONNECT.
              <br />
              <span>IMPROVE.</span>
            </h1>

            <p>
              A fitness journey that adapts to you.
              Discover the right activities, connect with
              your community and keep progressing.
            </p>

            <button
              className="primary-btn"
              onClick={() =>
                setPage("profileForm")
              }
            >
              Start My Journey
              <span>→</span>
            </button>

            <div className="journey-strip">
              <span>ASSESS</span>
              <i>→</i>
              <span>RECOMMEND</span>
              <i>→</i>
              <span>PARTICIPATE</span>
              <i>→</i>
              <span>MEASURE</span>
              <i>→</i>
              <span>ADAPT</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>

            <div className="hero-card">
              <div className="mini-label">
                YOUR AURA LEVEL
              </div>

              <div className="hero-level">
                BEGINNER
              </div>

              <div className="hero-progress">
                <div></div>
              </div>

              <div className="hero-stat">
                <span>Consistency</span>
                <strong>72%</strong>
              </div>
            </div>

            <div className="floating-card floating-top">
              <b>🏃</b>

              <div>
                <small>Recommended</small>
                <strong>20 Min Run</strong>
              </div>
            </div>

            <div className="floating-card floating-bottom">
              <b>📍</b>

              <div>
                <small>Near You</small>
                <strong>Running Club</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="feature-row">
          <div>
            <small>01</small>
            <h3>Personalized</h3>

            <p>
              Recommendations based on your level,
              goals and progress.
            </p>
          </div>

          <div>
            <small>02</small>
            <h3>Connected</h3>

            <p>
              Discover clubs, events and challenges
              around you.
            </p>
          </div>

          <div>
            <small>03</small>
            <h3>Adaptive</h3>

            <p>
              Your next step evolves as your fitness
              journey progresses.
            </p>
          </div>
        </section>
      </div>
    );
  }

  /* =========================
     PROFILE FORM
  ========================= */

  if (page === "profileForm") {
    return (
      <div className="page simple-page">
        <nav className="navbar">
          <div className="logo">AURA</div>

          <button
            className="back-btn"
            onClick={() => setPage("home")}
          >
            ← Back
          </button>
        </nav>

        <main className="form-container">
          <div className="form-heading">
            <div className="step-label">
              STEP 01 / 03
            </div>

            <h1>
              Create your
              <br />
              <span>profile.</span>
            </h1>

            <p>
              Let's start with a few basic details.
            </p>
          </div>

          <div className="form-card">
            <div className="form-grid">

              <div className="field full">
                <label>Full Name</label>

                <input
                  type="text"
                  placeholder="Enter your name"
                  value={user.name}
                  onChange={(e) =>
                    updateUser(
                      "name",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="field">
                <label>Age</label>

                <input
                  type="number"
                  placeholder="Age"
                  value={user.age}
                  onChange={(e) =>
                    updateUser(
                      "age",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="field">
                <label>Sex</label>

                <select
                  value={user.sex}
                  onChange={(e) =>
                    updateUser(
                      "sex",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                  <option value="Other">
                    Other
                  </option>

                  <option value="Prefer not to say">
                    Prefer not to say
                  </option>
                </select>
              </div>

              <div className="field">
                <label>Height</label>

                <div className="input-unit">
                  <input
                    type="number"
                    placeholder="Height"
                    value={user.height}
                    onChange={(e) =>
                      updateUser(
                        "height",
                        e.target.value
                      )
                    }
                  />

                  <span>cm</span>
                </div>
              </div>

              <div className="field">
                <label>Weight</label>

                <div className="input-unit">
                  <input
                    type="number"
                    placeholder="Weight"
                    value={user.weight}
                    onChange={(e) =>
                      updateUser(
                        "weight",
                        e.target.value
                      )
                    }
                  />

                  <span>kg</span>
                </div>
              </div>

              <div className="field full">
                <label>Email Address</label>

                <input
                  type="email"
                  placeholder="you@example.com"
                  value={user.email}
                  onChange={(e) =>
                    updateUser(
                      "email",
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="field full">
                <label>Mobile Number</label>

                <div className="phone-input">
                  <span>+91</span>

                  <input
                    type="tel"
                    placeholder="Enter mobile number"
                    value={user.phone}
                    onChange={(e) =>
                      updateUser(
                        "phone",
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>

            </div>

            {error && (
              <div className="error">
                {error}
              </div>
            )}

            <button
              className="primary-btn form-btn"
              onClick={goToOTP}
            >
              Continue
              <span>→</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  /* =========================
     OTP
  ========================= */

  if (page === "otp") {
    return (
      <div className="page simple-page">
        <nav className="navbar">
          <div className="logo">AURA</div>

          <button
            className="back-btn"
            onClick={() =>
              setPage("profileForm")
            }
          >
            ← Back
          </button>
        </nav>

        <main className="center-container">
          <div className="otp-card">

            <div className="otp-icon">
              ✓
            </div>

            <div className="step-label">
              STEP 02 / 03
            </div>

            <h1>
              Verify your number
            </h1>

            <p>
              We've sent a 6-digit verification
              code to
            </p>

            <strong>
              +91 {user.phone}
            </strong>

            <div className="otp-inputs">
              <input
                maxLength="6"
                value={otp}
                onChange={(e) => {
                  setOtp(
                    e.target.value.replace(
                      /\D/g,
                      ""
                    )
                  );

                  setError("");
                }}
                placeholder="••••••"
              />
            </div>

            <div className="demo-note">
              Demo OTP: <strong>123456</strong>
            </div>

            {error && (
              <div className="error">
                {error}
              </div>
            )}

            <button
              className="primary-btn form-btn"
              onClick={verifyOTP}
            >
              Verify & Continue
              <span>→</span>
            </button>

            <button className="resend-btn">
              Resend OTP
            </button>
          </div>
        </main>
      </div>
    );
  }

  /* =========================
     ASSESSMENT
  ========================= */

  if (page === "assessment") {
    return (
      <div className="page simple-page">
        <nav className="navbar">
          <div className="logo">AURA</div>

          <button
            className="back-btn"
            onClick={() => setPage("otp")}
          >
            ← Back
          </button>
        </nav>

        <main className="assessment-container">

          <div className="form-heading">

            <div className="step-label">
              STEP 03 / 03
            </div>

            <h1>
              Build your
              <br />
              <span>fitness profile.</span>
            </h1>

            <p>
              This helps AURA understand where
              your journey should begin.
            </p>

          </div>

          <div className="form-card">

            {/* ACTIVITY LEVEL */}

            <div className="question">

              <h2>
                What's your current activity level?
              </h2>

              <div className="option-grid three">

                {[
                  [
                    "Beginner",
                    "I'm just getting started",
                  ],

                  [
                    "Moderately Active",
                    "I exercise regularly",
                  ],

                  [
                    "Highly Active",
                    "I train consistently",
                  ],
                ].map(
                  ([title, subtitle]) => (
                    <button
                      key={title}
                      className={`option ${
                        user.activityLevel ===
                        title
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        updateUser(
                          "activityLevel",
                          title
                        )
                      }
                    >
                      <strong>
                        {user.activityLevel ===
                        title
                          ? "✓ "
                          : ""}
                        {title}
                      </strong>

                      <span>
                        {subtitle}
                      </span>
                    </button>
                  )
                )}

              </div>

            </div>

            {/* GOAL */}

            <div className="question">

              <h2>
                What's your primary goal?
              </h2>

              <div className="option-grid">

                {[
                  [
                    "Get Fit",
                    "Build a healthier lifestyle",
                  ],

                  [
                    "Build Strength",
                    "Improve strength & fitness",
                  ],

                  [
                    "Improve Endurance",
                    "Run, cycle & stay active",
                  ],

                  [
                    "Sports Performance",
                    "Train for a sport",
                  ],
                ].map(
                  ([title, subtitle]) => (
                    <button
                      key={title}
                      className={`option ${
                        user.goal === title
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        updateUser(
                          "goal",
                          title
                        )
                      }
                    >
                      <strong>
                        {user.goal === title
                          ? "✓ "
                          : ""}
                        {title}
                      </strong>

                      <span>
                        {subtitle}
                      </span>
                    </button>
                  )
                )}

              </div>

            </div>

            {/* MULTI ACTIVITY */}

            <div className="question">

              <h2>
                What activities interest you?
              </h2>

              <p className="question-note">
                Select all that apply.
              </p>

              <div className="activity-options">

                {[
                  "Running",
                  "Walking",
                  "Cycling",
                  "Gym",
                  "Cricket",
                  "Football",
                ].map((activity) => (

                  <button
                    key={activity}
                    className={
                      user.activities.includes(
                        activity
                      )
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      toggleActivity(activity)
                    }
                  >
                    {user.activities.includes(
                      activity
                    )
                      ? "✓ "
                      : ""}

                    {activity}
                  </button>

                ))}

              </div>

            </div>

            {error && (
              <div className="error">
                {error}
              </div>
            )}

            <button
              className="primary-btn form-btn"
              onClick={finishAssessment}
            >
              Build My AURA
              <span>→</span>
            </button>

          </div>
        </main>
      </div>
    );
  }

  /* =========================
     AURA PROFILE
  ========================= */

  if (page === "profile") {
    const levelWidth =
      user.activityLevel === "Beginner"
        ? "28%"
        : user.activityLevel ===
          "Moderately Active"
        ? "62%"
        : "92%";

    return (
      <div className="page simple-page">

        <nav className="navbar">
          <div className="logo">
            AURA
          </div>
        </nav>

        <main className="profile-result">

          <div className="step-label">
            YOUR AURA PROFILE
          </div>

          <h1>
            Welcome,{" "}
            <span>{user.name}</span>.
          </h1>

          <p>
            We've created your starting point based
            on your profile and assessment.
          </p>

          <div className="profile-grid">

            <div className="profile-main-card">

              <small>
                YOUR CURRENT LEVEL
              </small>

              <div className="big-level">
                {user.activityLevel}
              </div>

              <div className="journey-progress">
                <div
                  className="journey-active"
                  style={{
                    width: levelWidth,
                  }}
                ></div>
              </div>

              <div className="level-labels">
                <span>Beginner</span>
                <span>
                  Moderately Active
                </span>
                <span>Athlete</span>
              </div>

              <div className="next-goal">
                <small>
                  NEXT GOAL
                </small>

                <strong>
                  Build consistency
                </strong>
              </div>

            </div>

            <div className="profile-info-card">

              <h3>
                Your Profile
              </h3>

              <div>
                <span>Age</span>
                <strong>
                  {user.age}
                </strong>
              </div>

              <div>
                <span>Sex</span>
                <strong>
                  {user.sex}
                </strong>
              </div>

              <div>
                <span>Height</span>
                <strong>
                  {user.height} cm
                </strong>
              </div>

              <div>
                <span>Weight</span>
                <strong>
                  {user.weight} kg
                </strong>
              </div>

              <div>
                <span>Goal</span>
                <strong>
                  {user.goal}
                </strong>
              </div>

              <div>
                <span>Activities</span>
                <strong>
                  {user.activities.join(
                    " + "
                  )}
                </strong>
              </div>

            </div>

          </div>

          <button
            className="primary-btn"
            onClick={() =>
              setPage("dashboard")
            }
          >
            Go To My Dashboard
            <span>→</span>
          </button>

        </main>
      </div>
    );
  }

  /* =========================
     ACTIVITY
  ========================= */

  if (page === "activity") {
    if (activityCompleted) {
      return (
        <div className="page simple-page">

          <nav className="navbar">
            <div className="logo">
              AURA
            </div>
          </nav>

          <main className="completion-page">

            <div className="success-icon">
              ✓
            </div>

            <div className="step-label">
              ACTIVITY COMPLETED
            </div>

            <h1>
              Great job,{" "}
              <span>
                {user.name.split(" ")[0]}.
              </span>
            </h1>

            <p>
              You just took another step forward
              in your fitness journey.
            </p>

            <div className="completion-stats">

              <div>
                <strong>
                  +25
                </strong>

                <span>
                  Activity Points
                </span>
              </div>

              <div>
                <strong>
                  🔥 {streak}
                </strong>

                <span>
                  Day Streak
                </span>
              </div>

              <div>
                <strong>
                  +1
                </strong>

                <span>
                  Active Day
                </span>
              </div>

            </div>

            <div className="adaptive-card">

              <small>
                AURA'S NEXT STEP
              </small>

              <h2>
                Your next goal has been
                updated.
              </h2>

              <p>
                {aiLoading
                  ? "AURA is generating your next personalized step..."
                  : currentRecommendation.nextGoal ||
                    currentRecommendation.reason ||
                    "Your next activity has been adapted from your latest progress."}
              </p>

            </div>

            <button
              className="primary-btn"
              onClick={() => {
                setActivityCompleted(false);
                setPage("dashboard");
              }}
            >
              Back To Dashboard
              <span>→</span>
            </button>

          </main>
        </div>
      );
    }

    return (
      <div className="page simple-page">

        <nav className="navbar">
          <div className="logo">
            AURA
          </div>

          <button
            className="back-btn"
            onClick={() =>
              setPage("dashboard")
            }
          >
            ← Dashboard
          </button>
        </nav>

        <main className="activity-page">

          <div className="step-label">
            TODAY'S ACTIVITY
          </div>

          <h1>
            {currentRecommendation.title}
          </h1>

          <p className="activity-intro">
            Stay consistent. Every completed
            activity moves your journey forward.
          </p>

          <div className="activity-session">

            <div className="activity-circle">
              <span>
                {currentRecommendation.duration.split(" ")[0]}
              </span>

              <small>
                MIN
              </small>
            </div>

            <div className="activity-details">

              <div>
                <small>
                  DIFFICULTY
                </small>

                <strong>
                  {currentRecommendation.difficulty}
                </strong>
              </div>

              <div>
                <small>
                  ACTIVITY
                </small>

                <strong>
                  {currentRecommendation.type}
                </strong>
              </div>

              <div>
                <small>
                  GOAL
                </small>

                <strong>
                  {user.goal}
                </strong>
              </div>

            </div>

          </div>

          <div className="activity-tip">

            <strong>
              AURA TIP
            </strong>

            <p>
              Focus on consistency rather than
              intensity. Complete today's activity
              at a comfortable pace.
            </p>

          </div>

          <button
            className="primary-btn"
            onClick={completeActivity}
          >
            Complete Activity
            <span>✓</span>
          </button>

        </main>
      </div>
    );
  }

  /* =========================
     DASHBOARD
  ========================= */

  /* =========================
   DASHBOARD
========================= */

if (page === "dashboard") {
  return (
    <div className="page dashboard-page">

      <nav className="navbar">

        <div className="logo">
          AURA
        </div>

        <div className="nav-links">

          <span
            className="nav-active"
            onClick={() => setPage("dashboard")}
          >
            Dashboard
          </span>

          <span
            onClick={() => setPage("community")}
          >
            Community
          </span>

          <span
            onClick={() => setPage("progress")}
          >
            Progress
          </span>

          <div className="avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>

        </div>

      </nav>

      <main className="dashboard">

        {/* =========================
           DASHBOARD HEADER
        ========================= */}

        <div className="dashboard-heading">

          <div>

            <small>
              YOUR FITNESS JOURNEY
            </small>

            <h1>
              Good morning,{" "}
              {user.name.split(" ")[0]}.
            </h1>

          </div>

          <div className="level-pill">
            {user.activityLevel}
          </div>

        </div>


        {/* =========================
           MAIN DASHBOARD
        ========================= */}

        <div className="dashboard-grid">

          {/* RECOMMENDATION */}

          <div className="recommendation-card">

            <small>
              {activityCompleted
                ? "NEXT AI RECOMMENDATION"
                : "RECOMMENDED FOR YOU"}
            </small>

            <h2>
              {currentRecommendation.title}
            </h2>

            <p>
              {aiLoading
                ? "AURA is adapting your next step using your latest progress..."
                : currentRecommendation.reason ||
                  "AURA selected this activity based on your fitness level, goal, preferences and progress."}
            </p>

            <div className="activity-meta">

              <span>
                {currentRecommendation.difficulty}
              </span>

              <span>
                {currentRecommendation.duration}
              </span>

              <span>
                {currentRecommendation.type}
              </span>

            </div>

            {!aiLoading && (
              <button
                className="primary-btn"
                onClick={() => setPage("activity")}
              >
                Start Activity
                <span>→</span>
              </button>
            )}

          </div>


          {/* STATS */}

          <div className="stats-card">

            <small>
              THIS WEEK
            </small>

            <div className="stat">

              <strong>
                {activeDays}
              </strong>

              <span>
                Active Days
              </span>

            </div>

            <div className="stat">

              <strong>
                {goalCompletion}%
              </strong>

              <span>
                Goal Completion
              </span>

            </div>

            <div className="stat">

              <strong>
                🔥 {streak}
              </strong>

              <span>
                Day Streak
              </span>

            </div>

          </div>

        </div>


        {/* AI STATUS */}

        {aiError && (
          <div className="ai-status">
            {aiError}
          </div>
        )}


        {/* =========================
           LOWER DASHBOARD
        ========================= */}

        <div className="dashboard-bottom">

          <div>

            <small>
              NEAR YOU
            </small>

            <h2>
              Find Your Community
            </h2>

            <p>
              Discover clubs, events and
              challenges matched to your level
              and interests.
            </p>

            <button
              className="outline-btn"
              onClick={() => setPage("community")}
            >
              Explore Community →
            </button>

          </div>


          <div>

            <small>
              YOUR PROGRESS
            </small>

            <h2>
              Keep moving forward.
            </h2>

            <p>
              Your activity and consistency help
              AURA determine your next step.
            </p>

            <button
              className="outline-btn"
              onClick={() => setPage("progress")}
            >
              View Progress →
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}
  
  /* =========================
     COMMUNITY
  ========================= */

  if (page === "community") {
    return (
      <div className="page simple-page">

        <nav className="navbar">

          <div className="logo">
            AURA
          </div>

          <button
            className="back-btn"
            onClick={() =>
              setPage("dashboard")
            }
          >
            ← Dashboard
          </button>

        </nav>

        <main className="community-page">

          <div className="form-heading">

            <div className="step-label">
              AURA COMMUNITY
            </div>

            <h1>
              Find your
              <br />
              <span>people.</span>
            </h1>

            <p>
              Activities and communities matched
              to your interests and fitness level.
            </p>

          </div>

          <div className="community-grid">

            <div className="community-card">

              <div className="community-icon">
                🏃
              </div>

              <small>
                2.1 KM AWAY
              </small>

              <h2>
                Running Club
              </h2>

              <p>
                Beginner friendly · Weekend runs
              </p>

              <button className="outline-btn">
                View Community →
              </button>

            </div>

            <div className="community-card">

              <div className="community-icon">
                🚴
              </div>

              <small>
                3.8 KM AWAY
              </small>

              <h2>
                Weekend Cycling
              </h2>

              <p>
                Moderate · Sunday 6:00 AM
              </p>

              <button className="outline-btn">
                Join Event →
              </button>

            </div>

            <div className="community-card">

              <div className="community-icon">
                🏆
              </div>

              <small>
                42 PARTICIPANTS
              </small>

              <h2>
                5K Challenge
              </h2>

              <p>
                Community challenge · Starts Saturday
              </p>

              <button className="outline-btn">
                Join Challenge →
              </button>

            </div>

          </div>

        </main>
      </div>
    );
  }

  /* =========================
     PROGRESS
  ========================= */

  if (page === "progress") {
    return (
      <div className="page simple-page">

        <nav className="navbar">

          <div className="logo">
            AURA
          </div>

          <button
            className="back-btn"
            onClick={() =>
              setPage("dashboard")
            }
          >
            ← Dashboard
          </button>

        </nav>

        <main className="progress-page">

          <div className="form-heading">

            <div className="step-label">
              YOUR PROGRESS
            </div>

            <h1>
              Keep getting
              <br />
              <span>better.</span>
            </h1>

          </div>

          <div className="progress-grid">

            <div className="progress-main-card">

              <small>
                WEEKLY ACTIVITY
              </small>

              <div className="chart">

                <div style={{ height: "35%" }}></div>
                <div style={{ height: "48%" }}></div>
                <div style={{ height: "42%" }}></div>
                <div style={{ height: "67%" }}></div>
                <div style={{ height: "80%" }}></div>
                <div style={{ height: "58%" }}></div>
                <div style={{ height: "90%" }}></div>

              </div>

              <div className="chart-labels">

                <span>M</span>
                <span>T</span>
                <span>W</span>
                <span>T</span>
                <span>F</span>
                <span>S</span>
                <span>S</span>

              </div>

            </div>

            <div className="progress-stats">

              <div>
                <strong>
                  {activeDays}
                </strong>

                <span>
                  Activities
                </span>
              </div>

              <div>
                <strong>
                  {goalCompletion}%
                </strong>

                <span>
                  Goal Completion
                </span>
              </div>

              <div>
                <strong>
                  {streak} 🔥
                </strong>

                <span>
                  Day Streak
                </span>
              </div>

            </div>

          </div>

          <div className="next-step-card">

            <div>

              <small>
                AURA'S NEXT STEP
              </small>

              <h2>{currentRecommendation.title}</h2>

              <p>
                {currentRecommendation.nextGoal ||
                  currentRecommendation.reason ||
                  "Complete your recommended activities to help AURA adapt your next goal."}
              </p>

            </div>

            <button
              className="primary-btn"
              onClick={() =>
                setPage("dashboard")
              }
            >
              Continue Journey
              <span>→</span>
            </button>

          </div>

        </main>
      </div>
    );
  }
  return null;
}
export default App;