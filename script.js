// ===== GLOBAL STATE =====
const state = {
    quizAnswers: [],
    quizScore: 0,
    exposurePercent: 0,
    email: '',
    phone: '',
    breachCount: 0,
    breaches: [],
    referralCode: '',
    currentQuestion: 0,
    categoryScores: {}
};

// ===== SUPABASE INITIALIZATION =====
const supabaseUrl = 'https://wufdrxuvmbteddybcfsl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZmRyeHV2bWJ0ZWRkeWJjZnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNzEwMTcsImV4cCI6MjA4Nzc0NzAxN30.tLKMdMioE-gWZbkDTGoZVx398BJsCSt2wBRkoxw-KcU';

let supabaseClient = null;
if (typeof window.supabase !== 'undefined') {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} else {
    console.warn("Supabase CDN blocked or failed to load. DB fetches disabled.");
}

// ===== STAGE NAVIGATION =====
function goToStage(num) {
    const current = document.querySelector('.stage.active');
    if (current) {
        current.style.opacity = '0';
        setTimeout(() => {
            current.classList.remove('active');
            const next = document.getElementById('stage' + num);
            next.classList.add('active');
            setTimeout(() => {
                next.style.opacity = '1';
                window.scrollTo(0, 0);
                if (num === 4) initStage4();
            }, 50);
        }, 600);
    }
}

// ===== STAGE 1: ROTATING SENTENCES =====
const threats = [
    "Your camera was accessed 47 times this week.",
    "3 apps on your phone can read your messages right now.",
    "Your email was found in 2 data breaches.",
    "Someone could be forwarding your calls. You'd never know.",
    "That QR code you scanned yesterday? It wasn't checked.",
    "73% of people don't know they're already compromised."
];

let currentThreat = 0;
const threatContainer = document.getElementById('threatContainer');

// Create sentence elements
threats.forEach((text, i) => {
    const el = document.createElement('p');
    el.className = 'threat-sentence' + (i === 0 ? ' visible' : ' hidden');
    el.textContent = text;
    threatContainer.appendChild(el);
});

function rotateThreat() {
    const sentences = document.querySelectorAll('.threat-sentence');
    sentences[currentThreat].className = 'threat-sentence hidden';
    currentThreat = (currentThreat + 1) % threats.length;
    sentences[currentThreat].className = 'threat-sentence visible';
}

setInterval(rotateThreat, 2000);

// Terminal timer
let terminalSeconds = 0;
setInterval(() => {
    terminalSeconds++;
    const h = String(Math.floor(terminalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((terminalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(terminalSeconds % 60).padStart(2, '0');
    document.getElementById('terminalTime').textContent = `${h}:${m}:${s}`;
}, 1000);

// Daily Click Counter (Starts at 1737 at midnight, scales through the day)
function updateDailyCounter() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const secondsSinceMidnight = Math.floor((now - startOfDay) / 1000);

    // Base is 1737. One click every ~28 seconds naturally through the day.
    const baseClicks = 1737;
    const clicksToday = baseClicks + Math.floor(secondsSinceMidnight / 28);

    const counterWrap = document.getElementById('dailyCounterWrap');
    const countSpan = document.getElementById('dailyCount');

    if (counterWrap && countSpan) {
        counterWrap.style.display = 'block';
        countSpan.textContent = clicksToday.toLocaleString();
    }
}

updateDailyCounter();
setInterval(updateDailyCounter, 10000);

// ===== STAGE 2: QUIZ =====
const questions = [
    {
        category: 'Password Hygiene',
        text: 'Do you use the same password for multiple accounts?',
        answers: [
            { emoji: '', text: 'Yes, for almost everything', points: 15 },
            { emoji: '', text: 'For some less important ones', points: 8 },
            { emoji: '', text: 'Never — I use a password manager', points: 0 }
        ]
    },
    {
        category: 'Phishing Awareness',
        text: 'Have you ever clicked a link from an unknown number or email?',
        answers: [
            { emoji: '', text: 'Yes, more than once', points: 15 },
            { emoji: '', text: 'Maybe once, by accident', points: 7 },
            { emoji: '', text: 'No, I always verify first', points: 0 }
        ]
    },
    {
        category: 'URL Safety',
        text: 'Do you scan QR codes without checking where the link goes?',
        answers: [
            { emoji: '', text: 'Yes, every time — I just scan', points: 13 },
            { emoji: '', text: 'Sometimes, if I\'m in a hurry', points: 6 },
            { emoji: '', text: 'Never — I always preview the URL', points: 0 }
        ]
    },
    {
        category: 'Device Health',
        text: 'Is your phone\'s operating system updated to the latest version?',
        answers: [
            { emoji: '', text: 'I don\'t know / I skip updates', points: 12 },
            { emoji: '', text: 'I update when I remember', points: 5 },
            { emoji: '', text: 'Always updated automatically', points: 0 }
        ]
    },
    {
        category: 'Privacy Control',
        text: 'Do you know which apps have access to your camera and microphone?',
        answers: [
            { emoji: '', text: 'No idea', points: 14 },
            { emoji: '', text: 'I\'ve checked once or twice', points: 6 },
            { emoji: '', text: 'Yes, I regularly review permissions', points: 0 }
        ]
    }
];

function startQuiz() {
    document.getElementById('quizIntro').style.display = 'none';
    const quizQ = document.getElementById('quizQuestions');
    quizQ.classList.add('active');
    renderQuestion(0);
}

function renderQuestion(index) {
    state.currentQuestion = index;
    const q = questions[index];
    const container = document.getElementById('questionsContainer');

    const progress = ((index + 1) / questions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressCounter').textContent = `${index + 1} / ${questions.length}`;

    container.innerHTML = `
                <div class="question-container active">
                    <p class="question-number">Q${index + 1}</p>
                    <h2 class="question-text">${q.text}</h2>
                    <div class="answer-cards">
                        ${q.answers.map((a, i) => `
                            <button class="answer-card" onclick="selectAnswer(${index}, ${i}, ${a.points}, '${q.category}')">
                                <span class="answer-emoji">${a.emoji}</span>
                                <span class="answer-text">${a.text}</span>
                                <span class="answer-check"></span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
}

function selectAnswer(qIndex, aIndex, points, category) {
    // Visual feedback
    const cards = document.querySelectorAll('.answer-card');
    cards.forEach(c => c.classList.remove('selected'));
    cards[aIndex].classList.add('selected');
    cards.forEach(c => c.style.pointerEvents = 'none');

    // Store
    state.quizAnswers[qIndex] = points;
    state.categoryScores[category] = points;

    // Next question or calculate
    setTimeout(() => {
        if (qIndex < questions.length - 1) {
            renderQuestion(qIndex + 1);
        } else {
            calculateScore();
        }
    }, 600);
}

async function calculateScore() {
    document.getElementById('quizQuestions').classList.remove('active');
    const calcDiv = document.getElementById('quizCalc');
    calcDiv.classList.add('active');

    const totalPoints = state.quizAnswers.reduce((a, b) => a + b, 0);
    const maxPoints = 69;
    state.exposurePercent = Math.round((totalPoints / maxPoints) * 100);
    state.quizScore = state.exposurePercent;

    // Animate cycling numbers
    let counter = 0;
    const numEl = document.getElementById('calcNumber');
    const interval = setInterval(() => {
        numEl.textContent = Math.floor(Math.random() * 95 + 5) + '%';
        counter++;
        if (counter > 20) {
            clearInterval(interval);
            numEl.textContent = state.exposurePercent + '%';
        }
    }, 100);

    // Set real waitlist count
    const waitlistCount = document.getElementById('waitlistCount');
    if (supabaseClient) {
        try {
            // Fetch the exact row count from Supabase
            const { count, error } = await supabaseClient
                .from('waitlist')
                .select('*', { count: 'exact', head: true });

            if (!error && count !== null) {
                const total = 1900 + count;
                waitlistCount.textContent = total.toLocaleString();
            } else {
                waitlistCount.textContent = '1,900'; // Fallback
            }
        } catch (e) {
            waitlistCount.textContent = '1,900'; // Fallback
        }
    } else {
        waitlistCount.textContent = '1,900'; // Fallback if blocked
    }

    // Animate categories
    const cats = document.querySelectorAll('.calc-category');
    cats.forEach((cat, i) => {
        setTimeout(() => cat.classList.add('visible'), 2500 + (i * 150));
    });

    // Show results
    setTimeout(() => {
        calcDiv.classList.remove('active');
        showResults();
    }, 4500);
}

function showResults() {
    const resultsDiv = document.getElementById('quizResults');
    resultsDiv.classList.add('active');

    // Animate gauge
    const gaugeFill = document.getElementById('gaugeFill');
    const circumference = 2 * Math.PI * 80;
    const offset = circumference - (state.exposurePercent / 100) * circumference;
    setTimeout(() => {
        gaugeFill.style.strokeDashoffset = offset;
    }, 300);

    // Animate number
    animateNumber('gaugeNumber', 0, state.exposurePercent, 2000);

    // Comparison and cross-stage text prep
    document.getElementById('comparisonText').textContent = state.exposurePercent + '%';
    document.getElementById('breachScoreRef').textContent = state.exposurePercent + '%';

    // Breakdown
    const breakdownList = document.getElementById('breakdownList');
    const categories = [
        'Password Hygiene', 'Phishing Awareness', 'URL Safety',
        'Device Health', 'Privacy Control'
    ];

    const maxPerCategory = [15, 15, 13, 12, 14];

    breakdownList.innerHTML = categories.map((cat, i) => {
        const score = state.categoryScores[cat] || 0;
        const max = maxPerCategory[i];
        const percent = Math.round((score / max) * 100);
        let level = 'low', badge = 'badge-low', label = 'LOW';
        if (percent > 60) { level = 'high'; badge = 'badge-high'; label = 'HIGH'; }
        else if (percent > 30) { level = 'med'; badge = 'badge-med'; label = 'MED'; }

        return `
                    <div class="breakdown-item" style="transition-delay: ${i * 150}ms">
                        <div class="breakdown-dot ${level}"></div>
                        <span class="breakdown-label">${cat}</span>
                        <div class="breakdown-bar-container">
                            <div class="breakdown-bar" style="transition-delay: ${i * 150 + 500}ms" data-width="${percent}%"></div>
                        </div>
                        <span class="breakdown-badge ${badge}">${label}</span>
                    </div>
                `;
    }).join('');

    // Animate breakdown items
    setTimeout(() => {
        document.querySelectorAll('.breakdown-item').forEach(item => {
            item.classList.add('visible');
        });
        document.querySelectorAll('.breakdown-bar').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    }, 500);
}

// ===== STAGE 3: BREACH CHECK =====

// Psychological Hook: Deterministic breach results based on quiz score
function checkBreach() {
    const email = document.getElementById('emailInput').value.trim();
    if (!email || !email.includes('@')) {
        document.getElementById('emailInput').style.borderColor = '#555';
        document.getElementById('emailInput').focus();
        return;
    }

    state.email = email;

    // Calculate breaches visually BEFORE the loading starts
    let numBreaches = 0;
    if (state.exposurePercent < 50) numBreaches = 0;
    else if (state.exposurePercent <= 70) numBreaches = 1;
    else if (state.exposurePercent <= 84) numBreaches = Math.random() > 0.5 ? 1 : 2;
    else if (state.exposurePercent <= 95) numBreaches = 2;
    else numBreaches = 3;

    state.breachCount = numBreaches;

    // Hide input, show loading
    document.getElementById('breachInput').style.display = 'none';
    const loading = document.getElementById('breachLoading');
    loading.classList.add('active');

    // The Loading Theater (Total ~3.8 seconds)
    setTimeout(() => document.getElementById('loadLine1').classList.add('visible'), 0);
    setTimeout(() => document.getElementById('loadLine2').classList.add('visible'), 800);
    setTimeout(() => document.getElementById('loadLine3').classList.add('visible'), 1600);
    setTimeout(() => document.getElementById('loadLine4').classList.add('visible'), 2400);
    setTimeout(() => document.getElementById('loadLine5').classList.add('visible'), 3200);

    // Execute the result
    setTimeout(() => {
        loading.classList.remove('active');
        if (state.breachCount > 0) {
            showBreachResults();
        } else {
            showNoBreachResults();
        }
    }, 3800);
}

function showBreachResults() {
    const results = document.getElementById('breachResults');
    results.classList.add('active');

    // Count up
    animateNumber('breachCountNum', 0, state.breachCount, 1000);

    // Email display
    document.getElementById('breachEmailDisplay').textContent = state.email;
}

function showNoBreachResults() {
    const results = document.getElementById('noBreachResults');
    results.classList.add('active');
    document.getElementById('noBreachScore').textContent = state.exposurePercent + '%';
}

// ===== STAGE 4: REVEAL + WAITLIST =====
function initStage4() {
    // Pre-fill email if we have it
    if (state.email) {
        document.getElementById('waitlistEmail').value = state.email;
    }

    // Animate features
    setTimeout(() => {
        document.querySelectorAll('.feature-item').forEach((item, i) => {
            setTimeout(() => item.classList.add('visible'), i * 200);
        });
    }, 800);
}

async function joinWaitlist() {
    const email = document.getElementById('waitlistEmail').value.trim();
    const phone = document.getElementById('waitlistPhone').value.trim();

    if (!email || !email.includes('@')) {
        document.getElementById('waitlistEmail').style.borderColor = '#ff4444';
        return;
    }

    state.phone = phone;
    const btn = document.getElementById('btnWaitlistSubmit');
    const originalText = btn.textContent;
    btn.textContent = 'Securing spot...';
    btn.style.pointerEvents = 'none';

    // Generate referral code
    state.referralCode = Math.random().toString(36).substring(2, 7);

    if (supabaseClient) {
        try {
            // Insert into Supabase Table
            const { data, error } = await supabaseClient
                .from('waitlist')
                .insert([
                    {
                        email: email,
                        phone: phone || null,
                        exposure_score: state.exposurePercent,
                        breaches_found: state.breachCount,
                        referral_code: state.referralCode
                    }
                ]);

            if (error) {
                if (error.code === '23505') {
                    // User already exists, handle gracefully
                    alert("This email is already on the waitlist!");
                    btn.textContent = originalText;
                    btn.style.pointerEvents = 'auto';
                    return;
                }
                throw error;
            }
        } catch (e) {
            console.error("Supabase Error:", e);
            // We proceed to the next screen anyway to not break the funnel if DB fails
        }
    }

    // Move to confirmation
    document.getElementById('waitlistForm').style.display = 'none';
    const confirm = document.getElementById('waitlistConfirm');
    confirm.classList.add('active');

    // Calculate precise position based on current UI count string
    const currentCountStr = document.getElementById('waitlistCount').textContent.replace(/,/g, '');
    const position = parseInt(currentCountStr) + 1;

    document.getElementById('confirmPosition').textContent = '#' + position.toLocaleString();
    document.getElementById('recapScore').textContent = state.exposurePercent + '%';
    document.getElementById('recapBreaches').textContent = state.breachCount;
    document.getElementById('refCode').textContent = state.referralCode;
}

// ===== SHARE FUNCTIONS =====
function shareScore(platform) {
    const text = `I'm ${state.exposurePercent}% digitally exposed  How exposed are you? Check yours →`;
    const url = 'https://zerothreats.com';

    if (platform === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'copy') {
        navigator.clipboard.writeText(`${text} ${url}`).then(() => {
            const btn = event.target;
            btn.textContent = '✓ Copied!';
            setTimeout(() => btn.textContent = ' Copy Result', 2000);
        });
    }
}

function shareWaitlist() {
    const text = `I just checked how exposed I am online — the results were eye-opening. Check yours:`;
    const url = `https://zerothreats.com/?ref=${state.referralCode}`;

    if (navigator.share) {
        navigator.share({ title: 'How Exposed Are You?', text: text, url: url });
    } else {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    }
}

function copyReferralLink() {
    const url = `zerothreats.com/?ref=${state.referralCode}`;
    navigator.clipboard.writeText(url).then(() => {
        const btn = event.target;
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.textContent = ' Copy Link', 2000);
    });
}

// ===== UTILITY =====
function animateNumber(elementId, start, end, duration) {
    const el = document.getElementById(elementId);
    let startTime = null;
    const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(start + (end - start) * eased);
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}
